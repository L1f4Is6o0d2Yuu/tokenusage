import "server-only";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import Database from "better-sqlite3";
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

const DEFAULT_PATH = path.join(os.homedir(), ".hermes", "state.db");

function resolvePath(): string {
  const override = process.env.TOKENUSAGE_HERMES_DB;
  if (override && override.length > 0) return override;
  return DEFAULT_PATH;
}

function open(dbPath: string): Database.Database {
  // readonly + fileMustExist so we never accidentally mutate the user's DB
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

function rowToRecord(row: SessionRow): UsageRecord {
  const cost = row.actual_cost_usd ?? row.estimated_cost_usd ?? null;
  return {
    id: row.id,
    provider: "hermes",
    source: row.source,
    model: row.model,
    // hermes stores started_at/ended_at as REAL unix seconds — convert to ms
    startedAt: Math.round(row.started_at * 1000),
    endedAt: row.ended_at == null ? null : Math.round(row.ended_at * 1000),
    inputTokens: row.input_tokens ?? 0,
    outputTokens: row.output_tokens ?? 0,
    cacheReadTokens: row.cache_read_tokens ?? 0,
    cacheWriteTokens: row.cache_write_tokens ?? 0,
    reasoningTokens: row.reasoning_tokens ?? 0,
    costUsd: cost,
    costStatus: row.cost_status,
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
    const dbPath = resolvePath();
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
  },
};
