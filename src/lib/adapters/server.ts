import "server-only";
import { openServerDb } from "@/lib/server-db";
import { resolveUsageCost } from "@/lib/pricing";
import type { UsageRecord } from "@/lib/types";

type Row = {
  id: number;
  provider: string;
  external_id: string;
  source: string | null;
  model: string | null;
  started_at: number;
  ended_at: number | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  cost_usd: number | null;
  cost_status: string | null;
  api_call_count: number;
  title: string | null;
};

export function loadServerRecords(userId: number): UsageRecord[] {
  const db = openServerDb();
  try {
    const rows = db
      .prepare(
        `SELECT id, provider, external_id, source, model, started_at, ended_at,
                input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                reasoning_tokens, cost_usd, cost_status, api_call_count, title
         FROM sessions_data
         WHERE user_id = ?
         ORDER BY started_at DESC`
      )
      .all(userId) as Row[];
    return rows.map((r) => {
      const tokens = {
        input: r.input_tokens,
        output: r.output_tokens,
        cacheRead: r.cache_read_tokens,
        cacheWrite: r.cache_write_tokens,
        reasoning: r.reasoning_tokens,
      };
      const resolvedCost = resolveUsageCost({
        provider: r.provider,
        model: r.model,
        costUsd: r.cost_usd,
        costStatus: r.cost_status,
        tokens,
      });
      return {
        id: `${r.provider}:${r.external_id}`,
        provider: r.provider,
        source: r.source ?? "",
        model: r.model,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        cacheReadTokens: tokens.cacheRead,
        cacheWriteTokens: tokens.cacheWrite,
        reasoningTokens: tokens.reasoning,
        costUsd: resolvedCost.costUsd,
        costStatus: resolvedCost.status,
        apiCallCount: r.api_call_count,
        title: r.title,
      };
    });
  } finally {
    db.close();
  }
}

export function countServerRecords(userId: number): number {
  const db = openServerDb();
  try {
    const row = db
      .prepare(`SELECT COUNT(*) AS n FROM sessions_data WHERE user_id = ?`)
      .get(userId) as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}
