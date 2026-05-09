#!/usr/bin/env node
// Generates data/sample.db with synthetic multi-provider usage records so the
// dashboard renders without a real hermes install. No real user data — fully fake.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "data");
const outPath = path.join(outDir, "sample.db");

// Seeded RNG so the committed file is stable.
let seed = 0xC0DE;
function rand() {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function int(min, max) {
  return Math.floor(min + rand() * (max - min));
}

const PROVIDERS = [
  {
    provider: "hermes",
    source: "claude-code",
    models: [
      { name: "claude-opus-4-7", inUsd: 15 / 1e6, outUsd: 75 / 1e6 },
      { name: "claude-sonnet-4-6", inUsd: 3 / 1e6, outUsd: 15 / 1e6 },
    ],
  },
  {
    provider: "hermes",
    source: "codex",
    models: [
      { name: "gpt-5-codex", inUsd: 5 / 1e6, outUsd: 20 / 1e6 },
      { name: "o4-mini", inUsd: 1.1 / 1e6, outUsd: 4.4 / 1e6 },
    ],
  },
  {
    provider: "hermes",
    source: "deepseek",
    models: [
      { name: "deepseek-v4-pro", inUsd: 0.27 / 1e6, outUsd: 1.1 / 1e6 },
      { name: "deepseek-reasoner", inUsd: 0.55 / 1e6, outUsd: 2.19 / 1e6 },
    ],
  },
];

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

const db = new Database(outPath);
db.exec(`
  CREATE TABLE records (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    source TEXT NOT NULL,
    model TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL,
    cost_status TEXT,
    api_call_count INTEGER NOT NULL DEFAULT 0,
    title TEXT
  );
  CREATE INDEX idx_started ON records(started_at DESC);
`);

const insert = db.prepare(`
  INSERT INTO records VALUES (
    @id, @provider, @source, @model, @started_at, @ended_at,
    @input_tokens, @output_tokens, @cache_read_tokens, @cache_write_tokens,
    @reasoning_tokens, @cost_usd, @cost_status, @api_call_count, @title
  )
`);

const TITLES = [
  "Refactor auth middleware",
  "Investigate flaky CI test",
  "Draft RFC for caching layer",
  "Migrate to Next.js 16",
  "Build token usage dashboard",
  "Debug OOM in worker",
  "Write release notes",
  "Tune retrieval prompts",
  "Spike: vector search",
  "Pair on payments bug",
];

const now = Date.now();
const DAYS = 30;
const SESSIONS_PER_DAY = 8;

const txn = db.transaction(() => {
  let n = 0;
  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = now - d * 24 * 60 * 60 * 1000;
    const count = int(SESSIONS_PER_DAY - 3, SESSIONS_PER_DAY + 4);
    for (let i = 0; i < count; i++) {
      const cfg = pick(PROVIDERS);
      const model = pick(cfg.models);
      const startedAt = dayStart - int(0, 24 * 60 * 60 * 1000);
      const durationMs = int(5_000, 600_000);
      const inputTokens = int(500, 30_000);
      const outputTokens = int(200, 8_000);
      const cacheReadTokens = rand() < 0.6 ? int(0, 50_000) : 0;
      const cacheWriteTokens = rand() < 0.3 ? int(0, 5_000) : 0;
      const reasoningTokens =
        cfg.source === "codex" || model.name.includes("reasoner") ? int(0, 6_000) : 0;
      const costUsd =
        inputTokens * model.inUsd +
        outputTokens * model.outUsd +
        cacheReadTokens * model.inUsd * 0.1 +
        cacheWriteTokens * model.inUsd * 1.25 +
        reasoningTokens * model.outUsd;
      n += 1;
      insert.run({
        id: `sample-${n}`,
        provider: cfg.provider,
        source: cfg.source,
        model: model.name,
        started_at: startedAt,
        ended_at: startedAt + durationMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_tokens: cacheReadTokens,
        cache_write_tokens: cacheWriteTokens,
        reasoning_tokens: reasoningTokens,
        cost_usd: Number(costUsd.toFixed(6)),
        cost_status: "estimated",
        api_call_count: int(1, 25),
        title: pick(TITLES),
      });
    }
  }
  return n;
});

const total = txn();
db.close();
console.log(`Wrote ${total} records to ${path.relative(repoRoot, outPath)}`);
