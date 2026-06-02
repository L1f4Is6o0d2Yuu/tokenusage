import "server-only";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import Database from "better-sqlite3";
import { resolveUsageCost } from "@/lib/pricing";
import type { ProviderAdapter, AdapterStatus, UsageRecord } from "@/lib/types";

type SessionRow = {
  id: string;
  source: string;
  model: string | null;
  started_at: number;
  ended_at: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  reasoning_tokens: number | null;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  cost_status: string | null;
  api_call_count: number | null;
  title: string | null;
};

// os.homedir() throws "operation not permitted" under Workers'
// nodejs_compat. Deferring the call into the function keeps module-init
// harmless on the CF runtime — the single-user code path that actually
// reaches resolvePath only runs in the Node/Docker build.
function resolvePath(): string {
  const override = process.env.TOKENUSAGE_HERMES_DB;
  if (override && override.length > 0) return override;
  return path.join(os.homedir(), ".hermes", "state.db");
}

function open(dbPath: string): Database.Database {
  // readonly + fileMustExist so we never accidentally mutate the user's DB
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

function rowToRecord(row: SessionRow): UsageRecord {
  const sourceCost = row.actual_cost_usd ?? row.estimated_cost_usd ?? null;
  const tokens = {
    input: row.input_tokens ?? 0,
    output: row.output_tokens ?? 0,
    cacheRead: row.cache_read_tokens ?? 0,
    cacheWrite: row.cache_write_tokens ?? 0,
    reasoning: row.reasoning_tokens ?? 0,
  };
  const resolvedCost = resolveUsageCost({
    provider: "hermes",
    model: row.model,
    costUsd: sourceCost,
    costStatus: row.cost_status,
    tokens,
  });
  return {
    id: row.id,
    provider: "hermes",
    source: row.source,
    model: row.model,
    // hermes stores started_at/ended_at as REAL unix seconds — convert to ms
    startedAt: Math.round(row.started_at * 1000),
    endedAt: row.ended_at == null ? null : Math.round(row.ended_at * 1000),
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    cacheReadTokens: tokens.cacheRead,
    cacheWriteTokens: tokens.cacheWrite,
    reasoningTokens: tokens.reasoning,
    costUsd: resolvedCost.costUsd,
    costStatus: resolvedCost.status,
    apiCallCount: row.api_call_count ?? 0,
    title: row.title,
  };
}

export const hermesAdapter: ProviderAdapter = {
  id: "hermes",
  label: "Hermes Gateway",

  async status(): Promise<AdapterStatus> {
    const dbPath = resolvePath();
    if (!fs.existsSync(dbPath)) {
      return { ok: false, reason: "database file not found", sourcePath: dbPath };
    }
    try {
      const db = open(dbPath);
      try {
        const row = db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as {
          n: number;
        };
        return { ok: true, recordCount: row.n, sourcePath: dbPath };
      } finally {
        db.close();
      }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "unknown error",
        sourcePath: dbPath,
      };
    }
  },

  async load(): Promise<UsageRecord[]> {
    return parseHermesFromPath(resolvePath());
  },
};

// Pure parser used both by the local adapter and by /api/upload (which
// extracts uploaded tar.gz to a temp dir and points us at it).
export function parseHermesFromPath(dbPath: string): UsageRecord[] {
  if (!fs.existsSync(dbPath)) return [];
  const db = open(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT
           id, source, model, started_at, ended_at,
           input_tokens, output_tokens,
           cache_read_tokens, cache_write_tokens, reasoning_tokens,
           estimated_cost_usd, actual_cost_usd, cost_status,
           api_call_count, title
         FROM sessions
         ORDER BY started_at DESC`
      )
      .all() as SessionRow[];
    return rows.map(rowToRecord);
  } finally {
    db.close();
  }
}
