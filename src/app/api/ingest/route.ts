import type { NextRequest } from "next/server";
import { authenticateApiToken } from "@/lib/auth";
import { openServerDb } from "@/lib/server-db";
import { classifySqliteError, retryableErrorHeaders } from "@/lib/sqlite-errors";
import { recordAudit } from "@/lib/audit";
import { clearUploadInProgress, markUploaded } from "@/lib/sync-state";

type IngestRecord = {
  provider: string;
  externalId: string;
  source?: string | null;
  model?: string | null;
  startedAt: number;
  endedAt?: number | null;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  costUsd?: number | null;
  costStatus?: string | null;
  apiCallCount?: number;
  title?: string | null;
};

function err(
  status: number,
  message: string,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}


export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return err(401, "missing bearer token");
  }
  const user = authenticateApiToken(auth.slice(7).trim());
  if (!user) return err(401, "invalid token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "body must be JSON");
  }
  const records = Array.isArray(body) ? body : Array.isArray((body as { records?: unknown[] })?.records) ? (body as { records: unknown[] }).records : null;
  if (!records) return err(400, 'expected an array (or { "records": [...] })');

  const db = openServerDb();
  let inserted = 0;
  let updated = 0;
  try {
    const upsert = db.prepare(`
      INSERT INTO sessions_data (
        user_id, provider, external_id, source, model, started_at, ended_at,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
        reasoning_tokens, cost_usd, cost_status, api_call_count, title, ingested_at
      ) VALUES (
        @user_id, @provider, @external_id, @source, @model, @started_at, @ended_at,
        @input_tokens, @output_tokens, @cache_read_tokens, @cache_write_tokens,
        @reasoning_tokens, @cost_usd, @cost_status, @api_call_count, @title, @ingested_at
      )
      ON CONFLICT(user_id, provider, external_id) DO UPDATE SET
        source = excluded.source,
        model = excluded.model,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        input_tokens = excluded.input_tokens,
        output_tokens = excluded.output_tokens,
        cache_read_tokens = excluded.cache_read_tokens,
        cache_write_tokens = excluded.cache_write_tokens,
        reasoning_tokens = excluded.reasoning_tokens,
        cost_usd = excluded.cost_usd,
        cost_status = excluded.cost_status,
        api_call_count = excluded.api_call_count,
        title = excluded.title,
        ingested_at = excluded.ingested_at
    `);
    const now = Date.now();
    const txn = db.transaction((items: IngestRecord[]) => {
      for (const r of items) {
        if (!r || typeof r.provider !== "string" || typeof r.externalId !== "string") continue;
        if (typeof r.startedAt !== "number") continue;
        const before = db
          .prepare(
            `SELECT id FROM sessions_data WHERE user_id = ? AND provider = ? AND external_id = ?`
          )
          .get(user.id, r.provider, r.externalId);
        upsert.run({
          user_id: user.id,
          provider: r.provider,
          external_id: r.externalId,
          source: r.source ?? null,
          model: r.model ?? null,
          started_at: r.startedAt,
          ended_at: r.endedAt ?? null,
          input_tokens: r.inputTokens ?? 0,
          output_tokens: r.outputTokens ?? 0,
          cache_read_tokens: r.cacheReadTokens ?? 0,
          cache_write_tokens: r.cacheWriteTokens ?? 0,
          reasoning_tokens: r.reasoningTokens ?? 0,
          cost_usd: r.costUsd ?? null,
          cost_status: r.costStatus ?? null,
          api_call_count: r.apiCallCount ?? 0,
          title: r.title ?? null,
          ingested_at: now,
        });
        if (before) updated += 1;
        else inserted += 1;
      }
    });
    try {
      txn(records as IngestRecord[]);
    } catch (e) {
      const retry = classifySqliteError(e);
      if (retry) {
        console.error(
          `[api/ingest] retryable sqlite error (${retry.reason}):`,
          e instanceof Error ? e.message : e
        );
        return err(503, `server busy: ${retry.reason}`, retryableErrorHeaders(retry));
      }
      throw e;
    }
  } finally {
    db.close();
  }

  markUploaded(user.id);
  clearUploadInProgress(user.id);

  recordAudit({
    userId: user.id,
    action: "ingest",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
    meta: {
      submitted: Array.isArray(records) ? records.length : 0,
      inserted,
      updated,
    },
  });

  return new Response(
    JSON.stringify({ ok: true, inserted, updated, user: user.username }),
    { headers: { "content-type": "application/json" } }
  );
}
