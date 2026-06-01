import "server-only";
import { getTokenusageD1 } from "./cloudflare-bindings";
import { resolveUsageCost } from "./pricing";
import type { UsageRecord } from "./types";

// D1 mirror of lib/adapters/server.ts. Same column projection so the
// dashboard / share / leaderboard read paths get an identical
// UsageRecord shape regardless of runtime.

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

export async function loadServerRecordsD1(userId: number): Promise<UsageRecord[]> {
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `SELECT id, provider, external_id, source, model, started_at, ended_at,
              input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
              reasoning_tokens, cost_usd, cost_status, api_call_count, title
       FROM sessions_data
       WHERE user_id = ?
       ORDER BY started_at DESC`
    )
    .bind(userId)
    .all<Row>();
  const rows = result.results ?? [];
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
}

export async function countServerRecordsD1(userId: number): Promise<number> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM sessions_data WHERE user_id = ?`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
