import "server-only";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import readline from "node:readline";
import Database from "better-sqlite3";
import type { ProviderAdapter, AdapterStatus, UsageRecord } from "@/lib/types";
import { estimateCost } from "@/lib/pricing";

type ThreadRow = {
  id: string;
  model: string | null;
  model_provider: string;
  source: string;
  rollout_path: string;
  created_at: number;
  updated_at: number | null;
  title: string | null;
  tokens_used: number;
};

const DEFAULT_DIR = path.join(os.homedir(), ".codex");

function resolveDir(): string {
  return process.env.TOKENUSAGE_CODEX_DIR || DEFAULT_DIR;
}

function statePath(dir: string): string {
  return path.join(dir, "state_5.sqlite");
}

type TokenBreakdown = {
  input: number;
  output: number;
  cacheRead: number;
  reasoning: number;
};

// One pass over the JSONL recovers two things we need:
//   1. The cumulative `total_token_usage` (last token_count event_msg)
//   2. The first observed model — `turn_context` events carry it on
//      `payload.model`, and threads.model in state_5.sqlite is sometimes
//      NULL for the same row, so JSONL is the more reliable source.
async function lastTokenCountAndModel(
  jsonlPath: string
): Promise<{ tokens: TokenBreakdown | null; model: string | null }> {
  if (!fs.existsSync(jsonlPath)) return { tokens: null, model: null };
  const stream = fs.createReadStream(jsonlPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let last: TokenBreakdown | null = null;
  let model: string | null = null;
  for await (const line of rl) {
    if (!model && line.includes("\"turn_context\"")) {
      try {
        const obj = JSON.parse(line);
        if (obj?.type === "turn_context" && typeof obj.payload?.model === "string") {
          model = obj.payload.model;
        }
      } catch {
        // skip malformed line
      }
    }
    if (!line.includes("token_count")) continue;
    try {
      const obj = JSON.parse(line);
      if (obj?.type !== "event_msg") continue;
      const payload = obj.payload;
      if (payload?.type !== "token_count") continue;
      const total = payload.info?.total_token_usage;
      if (!total) continue;
      last = {
        input: Number(total.input_tokens ?? 0),
        output: Number(total.output_tokens ?? 0),
        cacheRead: Number(total.cached_input_tokens ?? 0),
        reasoning: Number(total.reasoning_output_tokens ?? 0),
      };
    } catch {
      // skip malformed line
    }
  }
  return { tokens: last, model };
}

function readThreads(dir: string): ThreadRow[] {
  const sp = statePath(dir);
  if (!fs.existsSync(sp)) return [];
  const db = new Database(sp, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare(
        `SELECT id, model, model_provider, source, rollout_path,
                created_at, updated_at, title, tokens_used
           FROM threads
          WHERE tokens_used > 0
          ORDER BY created_at DESC`
      )
      .all() as ThreadRow[];
  } finally {
    db.close();
  }
}

export const codexAdapter: ProviderAdapter = {
  id: "codex",
  label: "Codex CLI",

  async status(): Promise<AdapterStatus> {
    const dir = resolveDir();
    const sp = statePath(dir);
    if (!fs.existsSync(sp)) {
      return { ok: false, reason: "state_5.sqlite not found", sourcePath: dir };
    }
    try {
      const rows = readThreads(dir);
      return { ok: true, recordCount: rows.length, sourcePath: dir };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "unknown error",
        sourcePath: dir,
      };
    }
  },

  async load(): Promise<UsageRecord[]> {
    return parseCodexFromDir(resolveDir());
  },
};

// Pure parser used both by the local adapter and by /api/upload (which
// extracts uploaded tar.gz to a temp dir and points us at it).
//
// `dir` should contain `state_5.sqlite` and a `sessions/` subdirectory in
// the same shape as `~/.codex/`. The `rollout_path` recorded in the DB is
// usually an absolute host path; we re-anchor it onto `dir` by taking
// everything after `/sessions/`.
export async function parseCodexFromDir(dir: string): Promise<UsageRecord[]> {
  const threads = readThreads(dir);
  if (threads.length === 0) return [];
  const sessionsDir = path.join(dir, "sessions");

  const records = await Promise.all(
    threads.map(async (t): Promise<UsageRecord> => {
      const localPath = reanchorRolloutPath(t.rollout_path, sessionsDir);
      const { tokens: breakdown, model: jsonlModel } =
        await lastTokenCountAndModel(localPath);
      const input = breakdown?.input ?? 0;
      const output = breakdown?.output ?? 0;
      const cacheRead = breakdown?.cacheRead ?? 0;
      const reasoning = breakdown?.reasoning ?? 0;
      const fallback = breakdown ? 0 : t.tokens_used;
      // threads.model is often NULL for sessions that started before
      // codex 0.117; fall back to the model we found in the rollout JSONL.
      const model = t.model ?? jsonlModel;

      const cost = estimateCost(model, {
        input,
        output: output + fallback,
        cacheRead,
        cacheWrite: 0,
        reasoning,
      });

      return {
        id: `codex:${t.id}`,
        provider: "codex",
        source: t.source,
        model,
        startedAt: t.created_at * 1000,
        endedAt: t.updated_at ? t.updated_at * 1000 : null,
        inputTokens: input,
        outputTokens: output + fallback,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: 0,
        reasoningTokens: reasoning,
        costUsd: cost,
        costStatus: cost == null ? "unpriced" : "estimated",
        apiCallCount: 0,
        title: t.title,
      };
    })
  );

  return records;
}

function reanchorRolloutPath(rolloutPath: string, sessionsDir: string): string {
  // Local case: original path exists, just return it.
  if (fs.existsSync(rolloutPath)) return rolloutPath;
  // Uploaded case: peel off the `…/sessions/` prefix and rejoin onto the
  // extracted dir.
  const idx = rolloutPath.indexOf("/sessions/");
  if (idx === -1) return rolloutPath;
  const tail = rolloutPath.slice(idx + "/sessions/".length);
  return path.join(sessionsDir, tail);
}
