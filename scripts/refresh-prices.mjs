#!/usr/bin/env node
// Best-effort price refresher. Fetches each provider's public pricing page,
// runs a provider-specific regex extractor, and shows a diff against the
// current `data/prices.default.json`.
//
//   pnpm refresh-prices            # dry run — show diff, exit
//   pnpm refresh-prices --apply    # apply changes to data/prices.default.json
//   pnpm refresh-prices --raw      # also dump raw HTML to scripts/.fetched/
//
// This is brittle by design: each provider can change their page anytime. When
// a parser fails, we surface the URL and leave the current rule untouched —
// the maintainer's job is to eyeball the URL and patch by hand. Never silently
// drops or rewrites a rule we couldn't reparse.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PRICES_PATH = path.join(__dirname, "..", "data", "prices.default.json");
const FETCH_DIR = path.join(__dirname, ".fetched");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const RAW = args.has("--raw");

const PER_M = 1_000_000;

// ─── per-provider configuration ──────────────────────────────────────────────

/**
 * @typedef {{
 *   name: string,
 *   url: string,
 *   parse: (html: string) => Array<{match: string, input: number, output: number, cacheRead?: number, cacheWrite?: number}>,
 * }} Provider
 */

/** @type {Provider[]} */
const PROVIDERS = [
  {
    name: "Anthropic",
    url: "https://docs.anthropic.com/en/docs/about-claude/pricing",
    parse: parseAnthropic,
  },
  {
    name: "OpenAI",
    url: "https://platform.openai.com/docs/pricing",
    parse: parseOpenAI,
  },
  {
    name: "DeepSeek",
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    parse: parseDeepSeek,
  },
  {
    name: "Google Gemini",
    url: "https://ai.google.dev/gemini-api/docs/pricing",
    parse: parseGemini,
  },
];

// ─── extractors ──────────────────────────────────────────────────────────────
// Each extractor finds USD-per-million-token numbers and returns rules in the
// same shape as prices.default.json (rates are converted to per-token). They
// use brittle regex on rendered HTML because the alternative — every provider
// shipping a structured pricing API — does not exist.

function perTok(perM) {
  return perM / PER_M;
}

// Anthropic publishes a flat list per model:
//   "Claude <Family> X.Y $A / MTok $B / MTok $C / MTok $D / MTok $E / MTok"
// in column order [input, cache-write-5m, cache-write-1h, cache-hit, output].
// Models loaded via JS (Opus 4.x, Sonnet 4.x at time of writing) show
// "Loading..." instead of numbers and are silently skipped. We pick the
// highest version per family so the broad match (`opus`, `sonnet`, `haiku`)
// gets the newest priced row available in static HTML.
function parseAnthropic(html) {
  const text = stripTags(html);
  // Five dollar amounts each followed by "/ MTok", separated only by spaces.
  const ROW = /Claude\s+(Opus|Sonnet|Haiku)\s+([\d.]+)[^$]*?\$([\d.]+)\s*\/\s*MTok\s+\$([\d.]+)\s*\/\s*MTok\s+\$([\d.]+)\s*\/\s*MTok\s+\$([\d.]+)\s*\/\s*MTok\s+\$([\d.]+)\s*\/\s*MTok/gi;
  /** @type {Map<string,{version: string, input: number, output: number, cacheRead: number, cacheWrite: number}>} */
  const best = new Map();
  for (const m of text.matchAll(ROW)) {
    const family = m[1].toLowerCase();
    const version = m[2];
    const [input, cw5m, , cacheHit, output] = [
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6]),
      Number(m[7]),
    ];
    // Sanity: input < output, cache hit < input (cache is cheaper than fresh).
    if (!(input > 0 && output > input && cacheHit < input)) continue;
    const prior = best.get(family);
    if (prior == null || cmpVersion(version, prior.version) > 0) {
      best.set(family, { version, input, output, cacheRead: cacheHit, cacheWrite: cw5m });
    }
  }
  return [...best.entries()].map(([family, p]) => ({
    match: family,
    input: perTok(p.input),
    output: perTok(p.output),
    cacheRead: perTok(p.cacheRead),
    cacheWrite: perTok(p.cacheWrite),
  }));
}

function cmpVersion(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// OpenAI's pricing table lives at platform.openai.com/docs/pricing. Each model
// row lists Input / Cached input / Output as "$X.XX". We grab the first three
// dollar amounts after each known model name. Newer models (gpt-5.x, o4) only.
function parseOpenAI(html) {
  const text = stripTags(html);
  const rules = [];
  const families = [
    { name: /\bgpt-5\.5\b/i, match: "^gpt-5\\.5" },
    { name: /\bgpt-5\.4\b/i, match: "^gpt-5\\.4" },
    { name: /\bgpt-5\b(?!\.)/i, match: "^gpt-5" },
    { name: /\bo4-mini\b/i, match: "^o4-mini" },
    { name: /\bo4\b(?!-mini)/i, match: "^o4" },
  ];
  for (const f of families) {
    const idx = text.search(f.name);
    if (idx < 0) continue;
    const window = text.slice(idx, idx + 500);
    const nums = [...window.matchAll(/\$([\d.]+)/g)].map((x) => Number(x[1]));
    if (nums.length < 3) continue;
    const [input, cached, output] = nums;
    // sanity: output should be the largest
    if (output < input) continue;
    rules.push({
      match: f.match,
      input: perTok(input),
      output: perTok(output),
      cacheRead: perTok(cached),
    });
  }
  return rules;
}

// DeepSeek's pricing page is now a column-per-model table: deepseek-v4-flash
// and deepseek-v4-pro. Pro shows both a discounted and regular price, so each
// price row reads "$flash $pro_discount (75% off) $pro_regular". Legacy names
// deepseek-chat and deepseek-reasoner now correspond to flash modes, so both
// JSON rules track flash pricing.
function parseDeepSeek(html) {
  const text = stripTags(html);
  const start = text.search(/PRICING\s+1M\s+INPUT\s+TOKENS/i);
  if (start < 0) return [];
  const section = text.slice(start, start + 1000);
  const firstDollar = (label) => {
    const m = section.match(label);
    if (!m) return 0;
    const after = section.slice(m.index + m[0].length, m.index + m[0].length + 200);
    const d = after.match(/\$\s*([\d.]+)/);
    return d ? Number(d[1]) : 0;
  };
  const hit = firstDollar(/CACHE\s+HIT[^$]*/i);
  const miss = firstDollar(/CACHE\s+MISS[^$]*/i);
  const output = firstDollar(/OUTPUT\s+TOKENS[^$]*/i);
  if (!(miss > 0 && output >= miss && hit >= 0 && hit < miss)) return [];
  const flash = {
    input: perTok(miss),
    output: perTok(output),
    cacheRead: perTok(hit),
  };
  return [
    { match: "deepseek-reasoner", ...flash },
    { match: "deepseek", ...flash },
  ];
}

// Gemini docs page renders each model section with labeled rows:
//   "Input price ... $1.25, prompts $2.50, prompts > 200k tokens"
//   "Output price ... $10.00, prompts $15.00, prompts > 200k"
//   "Context caching price ... $0.125, prompts $0.25, prompts > 200k"
// We take the first dollar amount after each label (the ≤200k tier).
function parseGemini(html) {
  const text = stripTags(html);
  const idx = text.search(/Gemini\s+2\.5\s+Pro/i);
  if (idx < 0) return [];
  const window = text.slice(idx, idx + 1200);
  const input = firstDollarAfter(window, /Input price/i);
  const output = firstDollarAfter(window, /Output price/i);
  const cacheRead = firstDollarAfter(window, /Context caching price/i);
  if (!(input > 0 && output > input)) return [];
  const rule = {
    match: "gemini.*pro",
    input: perTok(input),
    output: perTok(output),
  };
  if (cacheRead > 0 && cacheRead < input) rule.cacheRead = perTok(cacheRead);
  return [rule];
}

function firstDollarAfter(text, label) {
  const m = text.match(label);
  if (!m) return 0;
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 100);
  const d = after.match(/\$\s*([\d.]+)/);
  return d ? Number(d[1]) : 0;
}

// ─── plumbing ────────────────────────────────────────────────────────────────

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ");
}

async function fetchPage(provider) {
  const res = await fetch(provider.url, {
    headers: {
      "user-agent":
        "tokenusage-refresh-prices/1.0 (+https://github.com/L1f4Is6o0d2Yuu/tokenusage)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function loadCurrent() {
  return JSON.parse(fs.readFileSync(PRICES_PATH, "utf8"));
}

function fmtRate(perToken) {
  if (perToken == null) return "—";
  return `$${(perToken * PER_M).toFixed(perToken * PER_M < 1 ? 4 : 2)}/M`;
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
    if (b == null) continue; // don't strip a field we currently track
    // 0.5% slop to ignore floating-point noise
    if (Math.abs(a - b) / Math.max(a, b) > 0.005) {
      changes.push({ f, kind: "changed", from: a, to: b });
    }
  }
  return changes;
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

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  if (RAW && !fs.existsSync(FETCH_DIR)) fs.mkdirSync(FETCH_DIR, { recursive: true });

  const current = loadCurrent();
  const updated = JSON.parse(JSON.stringify(current));
  let totalChanges = 0;
  let totalSkipped = 0;

  for (const provider of PROVIDERS) {
    process.stdout.write(`\n${cyan(`[${provider.name}]`)} ${dim(provider.url)}\n`);
    let html;
    try {
      html = await fetchPage(provider);
      process.stdout.write(`  ${green("✓")} fetched (${(html.length / 1024).toFixed(1)} KB)\n`);
    } catch (e) {
      process.stdout.write(
        `  ${red("✗")} fetch failed: ${e.message} — keeping current values\n`
      );
      totalSkipped++;
      continue;
    }
    if (RAW) {
      const safe = provider.name.replace(/[^\w-]+/g, "_").toLowerCase();
      fs.writeFileSync(path.join(FETCH_DIR, `${safe}.html`), html);
    }

    let fetched;
    try {
      fetched = provider.parse(html);
    } catch (e) {
      process.stdout.write(`  ${red("✗")} parser threw: ${e.message}\n`);
      totalSkipped++;
      continue;
    }
    if (fetched.length === 0) {
      process.stdout.write(
        `  ${yellow("⚠")} parser returned 0 rules — page layout likely changed, verify ${provider.url}\n`
      );
      totalSkipped++;
      continue;
    }
    process.stdout.write(`  ${green("✓")} parsed ${fetched.length} model${fetched.length === 1 ? "" : "s"}\n`);

    for (const f of fetched) {
      const idx = updated.rules.findIndex((r) => r.match === f.match);
      const currentRule = idx >= 0 ? current.rules[idx] : null;
      const changes = diffRule(currentRule, f);
      if (changes.length === 0) {
        process.stdout.write(
          `    ${dim("·")} ${dim(f.match.padEnd(20))} ${dim(`${fmtRate(f.input)}  ${fmtRate(f.output)}`)} ${green("unchanged")}\n`
        );
        continue;
      }
      process.stdout.write(`    ${yellow("△")} ${f.match.padEnd(20)}\n`);
      for (const c of changes) {
        process.stdout.write(
          `        ${c.f.padEnd(12)} ${red(fmtRate(c.from ?? 0))} ${dim("→")} ${green(fmtRate(c.to))}\n`
        );
      }
      totalChanges++;
      if (idx >= 0) {
        // overlay parsed numeric fields, keep existing match string
        updated.rules[idx] = { ...currentRule, ...stripUndefined(f) };
      } else {
        process.stdout.write(`        ${dim("(new rule — append manually if desired)")}\n`);
      }
    }
  }

  process.stdout.write(
    `\n${cyan("summary")} ${totalChanges} change${totalChanges === 1 ? "" : "s"}, ${totalSkipped} provider${totalSkipped === 1 ? "" : "s"} skipped\n`
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

function stripUndefined(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

main().catch((e) => {
  console.error(red("fatal:"), e);
  process.exit(1);
});
