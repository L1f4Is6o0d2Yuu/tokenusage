import "server-only";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import readline from "node:readline";
import type { ProviderAdapter, AdapterStatus, UsageRecord } from "@/lib/types";
import { estimateCost } from "@/lib/pricing";

const DEFAULT_DIR = path.join(os.homedir(), ".claude", "projects");

function resolveDir(): string {
  return process.env.TOKENUSAGE_CLAUDE_DIR || DEFAULT_DIR;
}

// `~/.claude/projects/<slug>/<sessionId>.jsonl`. Slug encodes the project's
// absolute path with `/` and `.` replaced by `-`, which is lossy. We keep the
// raw slug as `source` and use the last segment as a friendly project label.
function projectLabel(slug: string): string {
  const trimmed = slug.replace(/^-+/, "");
  const parts = trimmed.split("-").filter(Boolean);
  return parts[parts.length - 1] ?? slug;
}

type SessionAccumulator = {
  sessionId: string;
  projectSlug: string;
  model: string | null;
  firstTs: number | null;
  lastTs: number | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  apiCalls: number;
  title: string | null;
};

async function readSessionFile(filePath: string, projectSlug: string): Promise<SessionAccumulator | null> {
  const sessionId = path.basename(filePath, ".jsonl");
  const acc: SessionAccumulator = {
    sessionId,
    projectSlug,
    model: null,
    firstTs: null,
    lastTs: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    apiCalls: 0,
    title: null,
  };

  // A single API response can be serialized as multiple `assistant` JSONL rows
  // (one per content block — text / tool_use / thinking). Every row carries the
  // *same* `message.usage` for the whole response, so naive summation
  // multiplies tokens by the number of content blocks. Dedup by `message.id`
  // (fallback `requestId`) so each API call is counted exactly once.
  const seenApiCall = new Set<string>();

  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      const t = obj?.type;
      if (t === "ai-title" && typeof obj.aiTitle === "string" && !acc.title) {
        acc.title = obj.aiTitle;
      }
      if (t === "assistant") {
        const msg = obj.message;
        const usage = msg?.usage;
        if (!usage) continue;
        const dedupKey: string | null =
          (typeof msg.id === "string" && msg.id) ||
          (typeof obj.requestId === "string" && obj.requestId) ||
          null;
        if (dedupKey) {
          if (seenApiCall.has(dedupKey)) continue;
          seenApiCall.add(dedupKey);
        }
        acc.apiCalls += 1;
        if (!acc.model && typeof msg.model === "string") acc.model = msg.model;
        acc.inputTokens += Number(usage.input_tokens ?? 0);
        acc.outputTokens += Number(usage.output_tokens ?? 0);
        acc.cacheReadTokens += Number(usage.cache_read_input_tokens ?? 0);
        acc.cacheWriteTokens += Number(usage.cache_creation_input_tokens ?? 0);
        const ts = obj.timestamp ? Date.parse(obj.timestamp) : null;
        if (ts && !Number.isNaN(ts)) {
          if (acc.firstTs == null || ts < acc.firstTs) acc.firstTs = ts;
          if (acc.lastTs == null || ts > acc.lastTs) acc.lastTs = ts;
        }
      }
    } catch {
      // Skip malformed lines silently — claude-code logs are append-only and
      // can be truncated at the tail if a session crashed mid-write.
    }
  }
  if (acc.apiCalls === 0) return null;
  return acc;
}

async function listSessionFiles(rootDir: string): Promise<Array<{ file: string; slug: string }>> {
  const projects = await fs.readdir(rootDir, { withFileTypes: true });
  const out: Array<{ file: string; slug: string }> = [];
  for (const p of projects) {
    if (!p.isDirectory()) continue;
    const projectDir = path.join(rootDir, p.name);
    let entries;
    try {
      entries = await fs.readdir(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith(".jsonl")) {
        out.push({ file: path.join(projectDir, e.name), slug: p.name });
      }
    }
  }
  return out;
}

export const claudeCodeAdapter: ProviderAdapter = {
  id: "claude-code",
  label: "Claude Code",

  async status(): Promise<AdapterStatus> {
    const dir = resolveDir();
    if (!existsSync(dir)) {
      return { ok: false, reason: "claude-code projects dir not found", sourcePath: dir };
    }
    try {
      const files = await listSessionFiles(dir);
      return { ok: true, recordCount: files.length, sourcePath: dir };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "unknown error",
        sourcePath: dir,
      };
    }
  },

  async load(): Promise<UsageRecord[]> {
    return parseClaudeCodeFromDir(resolveDir());
  },
};

// Pure parser used both by the local adapter and by /api/upload.
// `dir` mirrors the layout of `~/.claude/projects/` — one folder per project
// (named with a slugified absolute path), each containing `<sessionId>.jsonl`.
export async function parseClaudeCodeFromDir(dir: string): Promise<UsageRecord[]> {
  if (!existsSync(dir)) return [];
  const files = await listSessionFiles(dir);
  const accs = await Promise.all(
    files.map((f) => readSessionFile(f.file, f.slug).catch(() => null))
  );
  return accs.flatMap((a): UsageRecord[] => {
    if (!a) return [];
    if (a.firstTs == null) return [];
    const cost = estimateCost(a.model, {
      input: a.inputTokens,
      output: a.outputTokens,
      cacheRead: a.cacheReadTokens,
      cacheWrite: a.cacheWriteTokens,
      reasoning: 0,
    });
    return [
      {
        id: `claude-code:${a.sessionId}`,
        provider: "claude-code",
        source: projectLabel(a.projectSlug),
        model: a.model,
        startedAt: a.firstTs,
        endedAt: a.lastTs,
        inputTokens: a.inputTokens,
        outputTokens: a.outputTokens,
        cacheReadTokens: a.cacheReadTokens,
        cacheWriteTokens: a.cacheWriteTokens,
        reasoningTokens: 0,
        costUsd: cost,
        costStatus: cost == null ? "unpriced" : "estimated",
        apiCallCount: a.apiCalls,
        title: a.title,
      },
    ];
  });
}
