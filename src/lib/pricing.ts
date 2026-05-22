// Loads the model price table once at module init. Default rules ship with
// the repo at data/prices.default.json. Users can drop a `data/prices.json`
// next to it to override (gitignored). Both files use the same schema.
//
// Estimates, not invoices.

import path from "node:path";
import fs from "node:fs";

export type ModelPricing = {
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken?: number;
  cacheWritePerToken?: number;
  reasoningPerToken?: number;
};

export type Rule = {
  match: string;
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
};

export type PriceFile = {
  version: number;
  rules: Rule[];
};

type CompiledRule = { regex: RegExp; price: ModelPricing };

const DATA_DIR = path.join(process.cwd(), "data");
const OVERRIDE_PATH = path.join(DATA_DIR, "prices.json");
const DEFAULT_PATH = path.join(DATA_DIR, "prices.default.json");

let cached: { compiled: CompiledRule[]; sourcePath: string; mtime: number } | null = null;

function compile(rules: Rule[]): CompiledRule[] {
  return rules.map((r) => ({
    regex: new RegExp(r.match, "i"),
    price: {
      inputPerToken: r.input,
      outputPerToken: r.output,
      cacheReadPerToken: r.cacheRead,
      cacheWritePerToken: r.cacheWrite,
      reasoningPerToken: r.reasoning,
    },
  }));
}

function readFileSafe(p: string): { file: PriceFile | null; mtime: number } {
  if (!fs.existsSync(p)) return { file: null, mtime: 0 };
  try {
    const stat = fs.statSync(p);
    const raw = fs.readFileSync(p, "utf8");
    return { file: JSON.parse(raw) as PriceFile, mtime: stat.mtimeMs };
  } catch {
    return { file: null, mtime: 0 };
  }
}

function ensureLoaded(): CompiledRule[] {
  // Try override first; fall back to default. Re-read whenever the active
  // file's mtime changes so edits via the editor take effect on next request
  // without a server restart.
  const override = readFileSafe(OVERRIDE_PATH);
  const target = override.file
    ? { file: override.file, mtime: override.mtime, sourcePath: OVERRIDE_PATH }
    : (() => {
        const def = readFileSafe(DEFAULT_PATH);
        return { file: def.file, mtime: def.mtime, sourcePath: DEFAULT_PATH };
      })();

  if (!target.file) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pricing] no price file found, all costs will be null");
    }
    return [];
  }

  if (
    cached &&
    cached.sourcePath === target.sourcePath &&
    cached.mtime === target.mtime
  ) {
    return cached.compiled;
  }

  const compiled = compile(target.file.rules);
  cached = { compiled, sourcePath: target.sourcePath, mtime: target.mtime };
  return compiled;
}

export function getPricing(model: string | null | undefined): ModelPricing | null {
  if (!model) return null;
  for (const { regex, price } of ensureLoaded()) {
    if (regex.test(model)) return price;
  }
  return null;
}

export type UsageCostInput = {
  provider: string;
  model: string | null | undefined;
  costUsd: number | null | undefined;
  costStatus: string | null | undefined;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning: number;
  };
};

export function estimateCost(
  model: string | null | undefined,
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning: number;
  }
): number | null {
  const p = getPricing(model);
  if (!p) return null;
  return (
    tokens.input * p.inputPerToken +
    tokens.output * p.outputPerToken +
    tokens.cacheRead * (p.cacheReadPerToken ?? p.inputPerToken * 0.1) +
    tokens.cacheWrite * (p.cacheWritePerToken ?? p.inputPerToken * 1.25) +
    tokens.reasoning * (p.reasoningPerToken ?? p.outputPerToken)
  );
}

export function resolveUsageCost(input: UsageCostInput): {
  costUsd: number | null;
  status: string | null;
} {
  const sourceCost = input.costUsd ?? null;
  const sourceStatus = input.costStatus ?? null;
  if (input.provider !== "hermes") {
    return { costUsd: sourceCost, status: sourceStatus };
  }

  const hasTokens =
    input.tokens.input +
      input.tokens.output +
      input.tokens.cacheRead +
      input.tokens.cacheWrite +
      input.tokens.reasoning >
    0;
  const shouldReprice = sourceCost == null || (sourceCost === 0 && hasTokens);
  if (!shouldReprice) return { costUsd: sourceCost, status: sourceStatus };

  const estimated = estimateCost(input.model, input.tokens);
  if (estimated == null) return { costUsd: sourceCost, status: sourceStatus };
  return { costUsd: estimated, status: "estimated" };
}

// ---- editor APIs (used by /prices server action) ----

export function readActivePrices(): {
  rules: Rule[];
  source: "override" | "default" | "missing";
  sourcePath: string;
} {
  const override = readFileSafe(OVERRIDE_PATH);
  if (override.file) {
    return {
      rules: override.file.rules,
      source: "override",
      sourcePath: OVERRIDE_PATH,
    };
  }
  const def = readFileSafe(DEFAULT_PATH);
  if (def.file) {
    return { rules: def.file.rules, source: "default", sourcePath: DEFAULT_PATH };
  }
  return { rules: [], source: "missing", sourcePath: DEFAULT_PATH };
}

export function writeOverride(rules: Rule[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload: PriceFile = { version: 1, rules };
  // Write atomically via temp file + rename so a partial write can't corrupt
  // the active price file.
  const tmp = OVERRIDE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, OVERRIDE_PATH);
}

export function deleteOverride(): boolean {
  if (!fs.existsSync(OVERRIDE_PATH)) return false;
  fs.unlinkSync(OVERRIDE_PATH);
  return true;
}
