#!/usr/bin/env node
// Price refresher backed by OpenRouter's models API.
//
//   pnpm refresh-prices            # dry run — show diff, exit
//   pnpm refresh-prices --apply    # apply changes to data/prices.default.json
//   pnpm refresh-prices --raw      # also dump raw JSON to scripts/.fetched/
//
// OpenRouter publishes per-token USD prices for every model it routes — one
// stable JSON endpoint covers what we used to scrape from each vendor's HTML
// (which kept breaking on layout changes). We map every rule in
// data/prices.default.json to a hand-picked OpenRouter model slug, pull the
// freshest prices, and overlay them onto the existing rules in place.
//
// When a model can't be found on OpenRouter the rule is left alone and the
// summary line surfaces the miss — that's the prompt to update the map.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PRICES_PATH = path.join(__dirname, "..", "data", "prices.default.json");
const FETCH_DIR = path.join(__dirname, ".fetched");
const SOURCE_URL = "https://openrouter.ai/api/v1/models";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const RAW = args.has("--raw");

const PER_M = 1_000_000;

// ─── rule → OpenRouter slug map ──────────────────────────────────────────
//
// Each rule in prices.default.json maps to one or more candidate slugs on
// OpenRouter. We try them in order; first hit wins. `family` rules (opus /
// sonnet / haiku, deepseek, gemini.*pro) ride the highest-version slug
// currently available because that's what users on those families will
// most often be running.

const MAP = {
  "^gpt-5\\.5":         ["openai/gpt-5.5"],
  "^gpt-5\\.4":         ["openai/gpt-5.4"],
  "^gpt-5":             ["openai/gpt-5"],
  "^o4-mini":           ["openai/o4-mini"],
  "^o4":                ["openai/o4"],
  "opus":               [
    "anthropic/claude-opus-4.7",
    "anthropic/claude-opus-4.6",
    "anthropic/claude-opus-4.5",
    "anthropic/claude-opus-4.1",
    "anthropic/claude-opus-4",
  ],
  "sonnet":             [
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-sonnet-4",
  ],
  "haiku":              [
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-haiku-3.5",
  ],
  "deepseek-reasoner":  ["deepseek/deepseek-r1", "deepseek/deepseek-reasoner"],
  "deepseek":           ["deepseek/deepseek-chat", "deepseek/deepseek-v3"],
  "gemini.*pro":        [
    "google/gemini-3-pro",
    "google/gemini-2.5-pro",
    "google/gemini-2-pro",
  ],
};

// ─── plumbing ────────────────────────────────────────────────────────────

async function fetchModels() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "tokenusage-refresh-prices/2.0 (+https://github.com/L1f4Is6o0d2Yuu/tokenusage)",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

// Type-annotated only via the JSDoc trick below since this is plain .mjs.
/**
 * @typedef {{
 *   id: string,
 *   pricing?: {
 *     prompt?: string,
 *     completion?: string,
 *     input_cache_read?: string,
 *     input_cache_write?: string,
 *     internal_reasoning?: string,
 *   }
 * }} ModelEntry
 */

function loadCurrent() {
  return JSON.parse(fs.readFileSync(PRICES_PATH, "utf8"));
}

function perTok(s) {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtRate(perToken) {
  if (perToken == null) return "—";
  const perM = perToken * PER_M;
  return `$${perM.toFixed(perM < 1 ? 4 : 2)}/M`;
}

function diffRule(current, fetched) {
  const fields = ["input", "output", "cacheRead", "cacheWrite"];
  const changes = [];
  for (const f of fields) {
    const a = current?.[f];
    const b = fetched?.[f];
    if (a == null && b == null) continue;
    if (a == null && b != null) {
      changes.push({ f, kind: "added", from: null, to: b });
      continue;
    }
    if (b == null) continue;
    // 0.5% slop to ignore floating-point noise
    if (Math.abs(a - b) / Math.max(a, b) > 0.005) {
      changes.push({ f, kind: "changed", from: a, to: b });
    }
  }
  return changes;
}

function pickModel(models, candidates) {
  // Index by id once for O(1) lookup across many candidates.
  if (!pickModel._byId) {
    pickModel._byId = new Map(models.map((m) => [m.id, m]));
  }
  for (const id of candidates) {
    const hit = pickModel._byId.get(id);
    if (hit?.pricing) return { id, pricing: hit.pricing };
  }
  return null;
}

function pricingToRule(pricing) {
  const input = perTok(pricing.prompt);
  const output = perTok(pricing.completion);
  if (input == null || output == null) return null;
  const rule = { input, output };
  const cacheRead = perTok(pricing.input_cache_read);
  const cacheWrite = perTok(pricing.input_cache_write);
  if (cacheRead != null) rule.cacheRead = cacheRead;
  if (cacheWrite != null) rule.cacheWrite = cacheWrite;
  return rule;
}

function colorize(s, code) {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}
const dim = (s) => colorize(s, "2");
const red = (s) => colorize(s, "31");
const green = (s) => colorize(s, "32");
const yellow = (s) => colorize(s, "33");
const cyan = (s) => colorize(s, "36");

function stripUndefined(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

// ─── main ────────────────────────────────────────────────────────────────

async function main() {
  if (RAW && !fs.existsSync(FETCH_DIR)) fs.mkdirSync(FETCH_DIR, { recursive: true });

  process.stdout.write(`${cyan("[OpenRouter]")} ${dim(SOURCE_URL)}\n`);
  let payload;
  try {
    payload = await fetchModels();
    process.stdout.write(
      `  ${green("✓")} fetched ${payload.data?.length ?? 0} models\n`
    );
  } catch (e) {
    process.stdout.write(`  ${red("✗")} fetch failed: ${e.message}\n`);
    process.exit(1);
  }
  if (RAW) {
    fs.writeFileSync(
      path.join(FETCH_DIR, "openrouter.json"),
      JSON.stringify(payload, null, 2)
    );
  }

  const current = loadCurrent();
  const updated = JSON.parse(JSON.stringify(current));
  let totalChanges = 0;
  let totalMissing = 0;

  for (const rule of updated.rules) {
    const candidates = MAP[rule.match];
    if (!candidates) {
      process.stdout.write(
        `  ${dim("·")} ${dim(rule.match.padEnd(22))} ${yellow("no mapping")}\n`
      );
      totalMissing++;
      continue;
    }
    const hit = pickModel(payload.data, candidates);
    if (!hit) {
      process.stdout.write(
        `  ${yellow("⚠")} ${rule.match.padEnd(22)} ${yellow("no OpenRouter model")} ${dim(`tried: ${candidates.join(", ")}`)}\n`
      );
      totalMissing++;
      continue;
    }
    const newRule = pricingToRule(hit.pricing);
    if (!newRule) {
      process.stdout.write(
        `  ${yellow("⚠")} ${rule.match.padEnd(22)} ${yellow("model has no prompt/completion price")} ${dim(`(${hit.id})`)}\n`
      );
      totalMissing++;
      continue;
    }
    const changes = diffRule(rule, newRule);
    if (changes.length === 0) {
      process.stdout.write(
        `  ${dim("·")} ${dim(rule.match.padEnd(22))} ${dim(`${fmtRate(newRule.input)}  ${fmtRate(newRule.output)}`)} ${green("unchanged")} ${dim(`(${hit.id})`)}\n`
      );
      continue;
    }
    process.stdout.write(
      `  ${yellow("△")} ${rule.match.padEnd(22)} ${dim(`(${hit.id})`)}\n`
    );
    for (const c of changes) {
      process.stdout.write(
        `      ${c.f.padEnd(12)} ${red(fmtRate(c.from ?? 0))} ${dim("→")} ${green(fmtRate(c.to))}\n`
      );
    }
    totalChanges++;
    // overlay parsed numeric fields, keep existing match string
    Object.assign(rule, stripUndefined(newRule));
  }

  process.stdout.write(
    `\n${cyan("summary")} ${totalChanges} change${totalChanges === 1 ? "" : "s"}, ${totalMissing} unmapped\n`
  );

  if (!APPLY) {
    process.stdout.write(
      `\n${dim("dry run — pass --apply to write changes to data/prices.default.json")}\n`
    );
    return;
  }
  if (totalChanges === 0) {
    process.stdout.write(`${dim("nothing to write")}\n`);
    return;
  }
  fs.writeFileSync(PRICES_PATH, JSON.stringify(updated, null, 2) + "\n", "utf8");
  process.stdout.write(`${green("✓")} wrote data/prices.default.json\n`);
}

main().catch((e) => {
  console.error(red("fatal:"), e);
  process.exit(1);
});
