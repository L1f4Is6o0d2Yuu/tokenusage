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

type Rule = {
  match: string;
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
};

type PriceFile = {
  version: number;
  rules: Rule[];
};

type CompiledRule = { regex: RegExp; price: ModelPricing };

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

function loadFile(p: string): PriceFile | null {
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as PriceFile;
  } catch {
    return null;
  }
}

function loadRules(): CompiledRule[] {
  const dataDir = path.join(process.cwd(), "data");
  const overridePath = path.join(dataDir, "prices.json");
  const defaultPath = path.join(dataDir, "prices.default.json");
  const file = loadFile(overridePath) ?? loadFile(defaultPath);
  if (!file) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pricing] no price file found, all costs will be null");
    }
    return [];
  }
  return compile(file.rules);
}

const RULES: CompiledRule[] = loadRules();

export function getPricing(model: string | null | undefined): ModelPricing | null {
  if (!model) return null;
  for (const { regex, price } of RULES) {
    if (regex.test(model)) return price;
  }
  return null;
}

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
