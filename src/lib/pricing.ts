// Loads the model price table once at module init. Default rules ship with
// the repo at data/prices.default.json and are bundled into the build via a
// JSON import so the module works in both Node (Docker) and Workers (CF)
// runtimes. In Node we additionally check for `data/prices.json` as a
// hot-reloadable override; in Workers fs isn't available, so overrides are
// a no-op there.
//
// Estimates, not invoices.

import { isCloudflareRuntime } from "./runtime";
import defaultPriceFile from "../../data/prices.default.json";

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

// Both the typed shape we want and what `resolveJsonModule` gives us
// happen to align here; the cast keeps the rest of the file simple.
const BUNDLED_DEFAULTS = defaultPriceFile as unknown as PriceFile;

let cached: { compiled: CompiledRule[]; sourceKey: string; mtime: number } | null = null;

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

type ResolvedSource = { file: PriceFile; sourceKey: string; mtime: number };

// Node-only override reader. Lives in its own function so the import of
// `node:fs` / `node:path` is reachable only from the Node code path —
// Workers builds tree-shake out of the worker bundle.
function readNodeOverride(): ResolvedSource | null {
  if (isCloudflareRuntime()) return null;
  // Dynamic require pattern keeps the static analyzer from pulling fs into
  // the Worker bundle even when the runtime check would have skipped it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const overridePath = path.join(process.cwd(), "data", "prices.json");
  if (!fs.existsSync(overridePath)) return null;
  try {
    const stat = fs.statSync(overridePath);
    const raw = fs.readFileSync(overridePath, "utf8");
    return {
      file: JSON.parse(raw) as PriceFile,
      sourceKey: overridePath,
      mtime: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

function ensureLoaded(): CompiledRule[] {
  const override = readNodeOverride();
  const target: ResolvedSource = override ?? {
    file: BUNDLED_DEFAULTS,
    sourceKey: "<bundled-defaults>",
    mtime: 0,
  };

  if (cached && cached.sourceKey === target.sourceKey && cached.mtime === target.mtime) {
    return cached.compiled;
  }

  const compiled = compile(target.file.rules);
  cached = { compiled, sourceKey: target.sourceKey, mtime: target.mtime };
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
//
// In CF runtime there's no writable disk, so the editor is read-only:
// readActivePrices returns the bundled defaults, and write/delete throw
// the same "unsupported on this runtime" message so the /prices page
// can surface a clear notice without a 500.

const CF_EDITOR_NOT_SUPPORTED =
  "Price overrides are not supported on the Cloudflare runtime — edit data/prices.default.json and redeploy.";

export function readActivePrices(): {
  rules: Rule[];
  source: "override" | "default" | "missing";
  sourcePath: string;
} {
  if (isCloudflareRuntime()) {
    return {
      rules: BUNDLED_DEFAULTS.rules,
      source: "default",
      sourcePath: "<bundled-defaults>",
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const DATA_DIR = path.join(process.cwd(), "data");
  const OVERRIDE_PATH = path.join(DATA_DIR, "prices.json");
  const DEFAULT_PATH = path.join(DATA_DIR, "prices.default.json");
  if (fs.existsSync(OVERRIDE_PATH)) {
    try {
      const raw = fs.readFileSync(OVERRIDE_PATH, "utf8");
      const file = JSON.parse(raw) as PriceFile;
      return { rules: file.rules, source: "override", sourcePath: OVERRIDE_PATH };
    } catch {
      // fall through to defaults
    }
  }
  return {
    rules: BUNDLED_DEFAULTS.rules,
    source: "default",
    sourcePath: DEFAULT_PATH,
  };
}

export function writeOverride(rules: Rule[]): void {
  if (isCloudflareRuntime()) throw new Error(CF_EDITOR_NOT_SUPPORTED);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const DATA_DIR = path.join(process.cwd(), "data");
  const OVERRIDE_PATH = path.join(DATA_DIR, "prices.json");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload: PriceFile = { version: 1, rules };
  const tmp = OVERRIDE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, OVERRIDE_PATH);
}

export function deleteOverride(): boolean {
  if (isCloudflareRuntime()) throw new Error(CF_EDITOR_NOT_SUPPORTED);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const DATA_DIR = path.join(process.cwd(), "data");
  const OVERRIDE_PATH = path.join(DATA_DIR, "prices.json");
  if (!fs.existsSync(OVERRIDE_PATH)) return false;
  fs.unlinkSync(OVERRIDE_PATH);
  return true;
}
