import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import type { ProviderAdapter, AdapterStatus, UsageRecord } from "@/lib/types";

const SAMPLE_PATH = path.join(process.cwd(), "data", "sample.db");

export const sampleAdapter: ProviderAdapter = {
  id: "sample",
  label: "Sample Data",

  async status(): Promise<AdapterStatus> {
    if (!fs.existsSync(SAMPLE_PATH)) {
      return { ok: false, reason: "sample.db not generated yet", sourcePath: SAMPLE_PATH };
    }
    const db = new Database(SAMPLE_PATH, { readonly: true, fileMustExist: true });
    try {
      const row = db.prepare("SELECT COUNT(*) AS n FROM records").get() as { n: number };
      return { ok: true, recordCount: row.n, sourcePath: SAMPLE_PATH };
    } finally {
      db.close();
    }
  },

  async load(): Promise<UsageRecord[]> {
    if (!fs.existsSync(SAMPLE_PATH)) return [];
    const db = new Database(SAMPLE_PATH, { readonly: true, fileMustExist: true });
    try {
      return db
        .prepare(
          `SELECT id, provider, source, model, started_at, ended_at,
                  input_tokens, output_tokens, cache_read_tokens,
                  cache_write_tokens, reasoning_tokens, cost_usd,
                  cost_status, api_call_count, title
           FROM records
           ORDER BY started_at DESC`
        )
        .all()
        .map(
          (r): UsageRecord => ({
            id: (r as { id: string }).id,
            provider: (r as { provider: string }).provider,
            source: (r as { source: string }).source,
            model: (r as { model: string | null }).model,
            startedAt: (r as { started_at: number }).started_at,
            endedAt: (r as { ended_at: number | null }).ended_at,
            inputTokens: (r as { input_tokens: number }).input_tokens,
            outputTokens: (r as { output_tokens: number }).output_tokens,
            cacheReadTokens: (r as { cache_read_tokens: number }).cache_read_tokens,
            cacheWriteTokens: (r as { cache_write_tokens: number }).cache_write_tokens,
            reasoningTokens: (r as { reasoning_tokens: number }).reasoning_tokens,
            costUsd: (r as { cost_usd: number | null }).cost_usd,
            costStatus: (r as { cost_status: string | null }).cost_status,
            apiCallCount: (r as { api_call_count: number }).api_call_count,
            title: (r as { title: string | null }).title,
          })
        );
    } finally {
      db.close();
    }
  },
};
