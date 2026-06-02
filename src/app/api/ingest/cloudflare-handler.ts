import type { NextRequest } from "next/server";
import { getTokenusageD1, type TokenusageD1Database } from "@/lib/cloudflare-bindings";
import { authenticateApiTokenD1 } from "@/lib/cloudflare-auth";
import { resolveUsageCost } from "@/lib/pricing";

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

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function recordAuditD1(
  db: TokenusageD1Database,
  params: {
    userId: number | null;
    action: "ingest" | "ingest_failed";
    ip: string | null;
    userAgent: string | null;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_log (user_id, action, ip, user_agent, meta, ts)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.userId,
        params.action,
        params.ip || null,
        params.userAgent ? params.userAgent.slice(0, 255) : null,
        params.meta ? JSON.stringify(params.meta) : null,
        Date.now()
      )
      .run();
  } catch (e) {
    console.error("[cloudflare audit] failed to record:", e);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const db = await getTokenusageD1();
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return err(401, "missing bearer token");
  }
  const user = await authenticateApiTokenD1(db, auth.slice(7).trim());
  if (!user) return err(401, "invalid token");

  const recordIngestFailed = (reason: string, meta: Record<string, unknown> = {}) =>
    recordAuditD1(db, {
      userId: user.id,
      action: "ingest_failed",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
      meta: { reason, ...meta },
    });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await recordIngestFailed("invalid_json");
    return err(400, "body must be JSON");
  }
  const records = Array.isArray(body)
    ? body
    : Array.isArray((body as { records?: unknown[] })?.records)
      ? (body as { records: unknown[] }).records
      : null;
  if (!records) {
    await recordIngestFailed("invalid_records_shape");
    return err(400, 'expected an array (or { "records": [...] })');
  }

  let inserted = 0;
  let updated = 0;
  const now = Date.now();
  try {
    for (const r of records as IngestRecord[]) {
      if (!r || typeof r.provider !== "string" || typeof r.externalId !== "string") continue;
      if (typeof r.startedAt !== "number") continue;
      const tokens = {
        input: r.inputTokens ?? 0,
        output: r.outputTokens ?? 0,
        cacheRead: r.cacheReadTokens ?? 0,
        cacheWrite: r.cacheWriteTokens ?? 0,
        reasoning: r.reasoningTokens ?? 0,
      };
      const resolvedCost = resolveUsageCost({
        provider: r.provider,
        model: r.model,
        costUsd: r.costUsd,
        costStatus: r.costStatus,
        tokens,
      });
      const before = await db
        .prepare(
          `SELECT id FROM sessions_data WHERE user_id = ? AND provider = ? AND external_id = ?`
        )
        .bind(user.id, r.provider, r.externalId)
        .first<{ id: number }>();
      await db
        .prepare(
          `INSERT INTO sessions_data (
            user_id, provider, external_id, source, model, started_at, ended_at,
            input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
            reasoning_tokens, cost_usd, cost_status, api_call_count, title, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ingested_at = excluded.ingested_at`
        )
        .bind(
          user.id,
          r.provider,
          r.externalId,
          r.source ?? null,
          r.model ?? null,
          r.startedAt,
          r.endedAt ?? null,
          tokens.input,
          tokens.output,
          tokens.cacheRead,
          tokens.cacheWrite,
          tokens.reasoning,
          resolvedCost.costUsd,
          resolvedCost.status,
          r.apiCallCount ?? 0,
          r.title ?? null,
          now
        )
        .run();
      if (before) updated += 1;
      else inserted += 1;
    }
  } catch (e) {
    await recordIngestFailed("exception", {
      submitted: Array.isArray(records) ? records.length : 0,
      message: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500),
    });
    throw e;
  }

  await db.prepare(`UPDATE users SET last_uploaded_at = ?, upload_started_at = NULL, upload_total_bytes = NULL WHERE id = ?`).bind(now, user.id).run();
  await recordAuditD1(db, {
    userId: user.id,
    action: "ingest",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
    meta: { submitted: Array.isArray(records) ? records.length : 0, inserted, updated },
  });

  return new Response(JSON.stringify({ ok: true, inserted, updated, user: user.username }), {
    headers: { "content-type": "application/json" },
  });
}
