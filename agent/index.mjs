#!/usr/bin/env node
// tokenusage agent — reads local Hermes / Codex / Claude Code data and posts
// it to a tokenusage server's /api/ingest endpoint.
//
// Usage:
//   TOKENUSAGE_SERVER=https://... TOKENUSAGE_TOKEN=tu_... node agent/index.mjs
//
// Or one-shot via flags:
//   node agent/index.mjs --server https://... --token tu_...
//
// Idempotent: each record is keyed by (provider, externalId) so re-running is
// safe and only changes existing rows. Designed to be run from cron / launchd.

import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import Database from "better-sqlite3";

// -------- config --------

function parseArgs() {
  const out = { server: null, token: null, dryRun: false };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--server") out.server = args[++i];
    else if (a === "--token") out.token = args[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  out.server = out.server ?? process.env.TOKENUSAGE_SERVER ?? null;
  out.token = out.token ?? process.env.TOKENUSAGE_TOKEN ?? null;
  return out;
}

// -------- adapters (subset of server-side logic, kept self-contained) --------

function readHermes() {
  const p = process.env.TOKENUSAGE_HERMES_DB || path.join(os.homedir(), ".hermes", "state.db");
  if (!fs.existsSync(p)) return [];
  const db = new Database(p, { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare(
        `SELECT id, source, model, started_at, ended_at,
                input_tokens, output_tokens,
                cache_read_tokens, cache_write_tokens, reasoning_tokens,
                estimated_cost_usd, actual_cost_usd, cost_status,
                api_call_count, title
         FROM sessions ORDER BY started_at DESC`
      )
      .all();
    return rows.map((r) => ({
      provider: "hermes",
      externalId: r.id,
      source: r.source,
      model: r.model,
      startedAt: Math.round(r.started_at * 1000),
      endedAt: r.ended_at == null ? null : Math.round(r.ended_at * 1000),
      inputTokens: r.input_tokens ?? 0,
      outputTokens: r.output_tokens ?? 0,
      cacheReadTokens: r.cache_read_tokens ?? 0,
      cacheWriteTokens: r.cache_write_tokens ?? 0,
      reasoningTokens: r.reasoning_tokens ?? 0,
      costUsd: r.actual_cost_usd ?? r.estimated_cost_usd ?? null,
      costStatus: r.cost_status,
      apiCallCount: r.api_call_count ?? 0,
      title: r.title,
    }));
  } finally {
    db.close();
  }
}

async function readCodex() {
  const dir = process.env.TOKENUSAGE_CODEX_DIR || path.join(os.homedir(), ".codex");
  const sp = path.join(dir, "state_5.sqlite");
  if (!fs.existsSync(sp)) return [];
  const db = new Database(sp, { readonly: true, fileMustExist: true });
  let threads;
  try {
    threads = db
      .prepare(
        `SELECT id, model, model_provider, source, rollout_path,
                created_at, updated_at, title, tokens_used
         FROM threads WHERE tokens_used > 0 ORDER BY created_at DESC`
      )
      .all();
  } finally {
    db.close();
  }
  const out = await Promise.all(
    threads.map(async (t) => {
      let breakdown = null;
      if (t.rollout_path && fs.existsSync(t.rollout_path)) {
        const stream = createReadStream(t.rollout_path, { encoding: "utf8" });
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
        for await (const line of rl) {
          if (!line.includes("token_count")) continue;
          try {
            const obj = JSON.parse(line);
            if (obj?.type !== "event_msg") continue;
            const total = obj.payload?.info?.total_token_usage;
            if (!total) continue;
            breakdown = {
              input: Number(total.input_tokens ?? 0),
              output: Number(total.output_tokens ?? 0),
              cacheRead: Number(total.cached_input_tokens ?? 0),
              reasoning: Number(total.reasoning_output_tokens ?? 0),
            };
          } catch {}
        }
      }
      const fallback = breakdown ? 0 : t.tokens_used;
      return {
        provider: "codex",
        externalId: t.id,
        source: t.source,
        model: t.model,
        startedAt: t.created_at * 1000,
        endedAt: t.updated_at ? t.updated_at * 1000 : null,
        inputTokens: breakdown?.input ?? 0,
        outputTokens: (breakdown?.output ?? 0) + fallback,
        cacheReadTokens: breakdown?.cacheRead ?? 0,
        cacheWriteTokens: 0,
        reasoningTokens: breakdown?.reasoning ?? 0,
        costUsd: null,
        costStatus: null,
        apiCallCount: 0,
        title: t.title,
      };
    })
  );
  return out;
}

async function readClaudeCode() {
  const dir =
    process.env.TOKENUSAGE_CLAUDE_DIR ||
    path.join(os.homedir(), ".claude", "projects");
  if (!fs.existsSync(dir)) return [];
  const projectDirs = await fsp.readdir(dir, { withFileTypes: true });
  const records = [];
  for (const p of projectDirs) {
    if (!p.isDirectory()) continue;
    const projectDir = path.join(dir, p.name);
    let entries;
    try {
      entries = await fsp.readdir(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
      const filePath = path.join(projectDir, e.name);
      const sessionId = e.name.replace(/\.jsonl$/, "");
      const acc = {
        provider: "claude-code",
        externalId: sessionId,
        source: lastSegment(p.name),
        model: null,
        startedAt: null,
        endedAt: null,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        costUsd: null,
        costStatus: null,
        apiCallCount: 0,
        title: null,
      };
      const stream = createReadStream(filePath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of rl) {
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj?.type === "ai-title" && typeof obj.aiTitle === "string" && !acc.title) {
            acc.title = obj.aiTitle;
          }
          if (obj?.type === "assistant") {
            const usage = obj.message?.usage;
            if (!usage) continue;
            acc.apiCallCount += 1;
            if (!acc.model && typeof obj.message?.model === "string") acc.model = obj.message.model;
            acc.inputTokens += Number(usage.input_tokens ?? 0);
            acc.outputTokens += Number(usage.output_tokens ?? 0);
            acc.cacheReadTokens += Number(usage.cache_read_input_tokens ?? 0);
            acc.cacheWriteTokens += Number(usage.cache_creation_input_tokens ?? 0);
            const ts = obj.timestamp ? Date.parse(obj.timestamp) : null;
            if (ts && !Number.isNaN(ts)) {
              if (acc.startedAt == null || ts < acc.startedAt) acc.startedAt = ts;
              if (acc.endedAt == null || ts > acc.endedAt) acc.endedAt = ts;
            }
          }
        } catch {}
      }
      if (acc.apiCallCount > 0 && acc.startedAt != null) records.push(acc);
    }
  }
  return records;
}

function lastSegment(slug) {
  const trimmed = slug.replace(/^-+/, "");
  const parts = trimmed.split("-").filter(Boolean);
  return parts[parts.length - 1] ?? slug;
}

// -------- main --------

async function main() {
  const cfg = parseArgs();
  if (!cfg.server || !cfg.token) {
    console.error(
      "Missing config. Provide --server and --token, or set TOKENUSAGE_SERVER and TOKENUSAGE_TOKEN."
    );
    process.exit(1);
  }

  const started = Date.now();
  console.error("[agent] reading local sources…");
  const [hermes, codex, claudeCode] = await Promise.all([
    Promise.resolve().then(readHermes),
    readCodex(),
    readClaudeCode(),
  ]);
  const records = [...hermes, ...codex, ...claudeCode];
  console.error(
    `[agent] ${records.length} records (hermes=${hermes.length} codex=${codex.length} claude-code=${claudeCode.length}) collected in ${Date.now() - started}ms`
  );

  if (cfg.dryRun) {
    console.error("[agent] --dry-run, skipping POST. Sample record:");
    console.error(JSON.stringify(records[0], null, 2));
    return;
  }

  // Chunk to avoid massive request bodies.
  const CHUNK = 500;
  let totalInserted = 0;
  let totalUpdated = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const url = `${cfg.server.replace(/\/$/, "")}/api/ingest`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(chunk),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[agent] HTTP ${res.status}: ${text}`);
      process.exit(1);
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error(`[agent] non-JSON response: ${text.slice(0, 200)}`);
      process.exit(1);
    }
    totalInserted += json.inserted ?? 0;
    totalUpdated += json.updated ?? 0;
    console.error(
      `[agent] chunk ${i / CHUNK + 1}: +${json.inserted} new / ~${json.updated} updated`
    );
  }
  console.error(
    `[agent] done. inserted=${totalInserted} updated=${totalUpdated} elapsed=${Date.now() - started}ms`
  );
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});
