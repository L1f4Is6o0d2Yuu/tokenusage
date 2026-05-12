import type { NextRequest } from "next/server";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { authenticateApiToken, recordAgentVersion } from "@/lib/auth";
import { openServerDb } from "@/lib/server-db";
import { markUploaded } from "@/lib/sync-state";
import { parseHermesFromPath } from "@/lib/adapters/hermes";
import { parseCodexFromDir } from "@/lib/adapters/codex";
import { parseClaudeCodeFromDir } from "@/lib/adapters/claude-code";
import type { UsageRecord } from "@/lib/types";

// Cap upload size at 500 MB. Real-world payloads are tens to a couple
// hundred MB (user's claude-code dir was ~190 MB uncompressed); compressed
// we expect an order of magnitude smaller. 500 MB is a safety net.
const MAX_BYTES = 500 * 1024 * 1024;

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function extractTarGz(req: NextRequest, dest: string): Promise<void> {
  if (!req.body) throw new Error("missing request body");
  const proc = spawn(
    "tar",
    ["xzf", "-", "-C", dest, "--no-same-owner", "--no-same-permissions"],
    { stdio: ["pipe", "pipe", "pipe"] }
  );
  let stderr = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });

  // Pipe Web ReadableStream → Node Readable → tar.stdin
  const nodeBody = Readable.fromWeb(req.body as never);
  nodeBody.pipe(proc.stdin);

  await new Promise<void>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited ${code}: ${stderr.trim().slice(0, 500)}`));
    });
  });
}

function upsertRecords(
  userId: number,
  records: UsageRecord[]
): { inserted: number; updated: number } {
  if (records.length === 0) return { inserted: 0, updated: 0 };
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
    const exists = db.prepare(
      `SELECT 1 FROM sessions_data WHERE user_id = ? AND provider = ? AND external_id = ?`
    );
    const now = Date.now();
    const txn = db.transaction(() => {
      for (const r of records) {
        // The local UsageRecord.id has the form `${provider}:${rawId}` to keep
        // it unique across providers in single-user mode. Strip the prefix
        // here so the DB's external_id is just the source-system id.
        const externalId = r.id.startsWith(`${r.provider}:`)
          ? r.id.slice(r.provider.length + 1)
          : r.id;
        const before = exists.get(userId, r.provider, externalId);
        upsert.run({
          user_id: userId,
          provider: r.provider,
          external_id: externalId,
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
    txn();
  } finally {
    db.close();
  }
  return { inserted, updated };
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return err(401, "missing bearer token");
  const user = authenticateApiToken(auth.slice(7).trim());
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) recordAgentVersion(user.id, reportedVersion);

  const lengthHeader = req.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BYTES) {
    return err(413, `payload too large (max ${MAX_BYTES} bytes)`);
  }

  const tempDir = path.join(
    os.tmpdir(),
    `tokenusage-upload-${user.id}-${crypto.randomBytes(6).toString("hex")}`
  );
  await fs.mkdir(tempDir, { recursive: true });

  try {
    await extractTarGz(req, tempDir);

    // Run all three parsers in parallel against the extracted tree. Missing
    // sources just yield empty arrays.
    const [hermesRecs, codexRecs, claudeRecs] = await Promise.all([
      Promise.resolve().then(() =>
        parseHermesFromPath(path.join(tempDir, "hermes.db"))
      ),
      parseCodexFromDir(path.join(tempDir, "codex")),
      parseClaudeCodeFromDir(path.join(tempDir, "claude-projects")),
    ]);

    const all = [...hermesRecs, ...codexRecs, ...claudeRecs];
    const { inserted, updated } = upsertRecords(user.id, all);
    markUploaded(user.id);

    return Response.json({
      ok: true,
      user: user.username,
      counts: {
        hermes: hermesRecs.length,
        codex: codexRecs.length,
        claudeCode: claudeRecs.length,
      },
      inserted,
      updated,
    });
  } catch (e) {
    return err(500, e instanceof Error ? e.message : "upload failed");
  } finally {
    fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
