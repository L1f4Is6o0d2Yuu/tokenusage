import type { Dictionary } from "../types";

const en: Dictionary = {
  meta: {
    title: "tokenusage",
    description: "Local-first token usage dashboard for AI coding tools",
  },
  header: {
    tagline: "Token spend across your AI tooling — read-only, local-first.",
  },
  language: { label: "Language" },
  period: {
    today: "Today",
    "24h": "Last 24h",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "All time",
    custom: "Custom",
    from: "from",
    to: "to",
    apply: "Apply",
  },
  banner: {
    readingFrom: "Reading from",
    noData: "No data sources found.",
    sampleBadge: "sample data",
  },
  cards: {
    totalSpend: "Total spend",
    totalTokens: "Total tokens",
    inputOutput: "Input / Output",
    cacheRead: "Cache read",
    estimated: "estimated",
    partialCost: "partial cost data",
    nonCache: "non-cache",
    sessions: (n) => `${n} sessions`,
    written: (f) => `${f} written`,
  },
  trend: {
    title: "Daily trend",
    description: (p) => `Tokens (left) and USD cost (right) per local day — ${p}`,
    empty: "No data in the selected period.",
    yTokens: "Tokens",
    yCost: "Cost",
  },
  topModels: {
    title: "Top models",
    description: "By total tokens",
    empty: "No usage in this period.",
  },
  breakdown: {
    title: "Breakdown by model",
    description:
      "Sorted by total tokens. Costs are estimates based on what your gateway recorded, not bills.",
    columns: {
      provider: "Provider",
      model: "Model",
      sessions: "Sessions",
      input: "Input",
      output: "Output",
      cacheRW: "Cache R/W",
      reasoning: "Reasoning",
      total: "Total",
      cost: "Cost",
    },
    empty: "No usage in this period.",
    editPrices: "Edit prices",
    exportCsv: "Export CSV",
  },
  recent: {
    title: "Recent sessions",
    description: "Latest 10 in this period — click to inspect.",
    empty: "No sessions in this period.",
    untitled: "(untitled session)",
  },
  session: {
    back: "← Back to dashboard",
    untitled: "(untitled session)",
    totalTokens: "Total tokens",
    cost: "Cost",
    started: "Started",
    duration: "Duration",
    stillOpen: "still open",
    endedAt: (w) => `ended ${w}`,
    breakdownTitle: "Token breakdown",
    breakdownDescription: "Captured by the source adapter at session close.",
    fields: {
      input: "Input",
      output: "Output",
      reasoning: "Reasoning",
      cacheRead: "Cache read",
      cacheWrite: "Cache write",
      apiCalls: "API calls",
    },
    costStatus: {
      estimated: "estimated",
      unpriced: "unpriced",
      unknown: "unknown",
    },
  },
  prices: {
    back: "← Back to dashboard",
    title: "Price table",
    description:
      "Edit per-model token prices. All values are in USD per 1M tokens. Match is a case-insensitive regex against the model name.",
    badges: {
      override: "override active",
      defaults: "defaults",
      missing: "no price file",
    },
    saved: "Saved. Cost estimates refresh on next dashboard load.",
    resetDone: "Override removed. Falling back to bundled defaults.",
    rulesTitle: "Rules",
    rulesDescription:
      "Rules are matched in order — first match wins. Leave a row's match blank to drop it. The last (blank) row is for adding a new rule.",
    columns: {
      match: "Match (regex)",
      input: "Input",
      output: "Output",
      cacheRead: "Cache R",
      cacheWrite: "Cache W",
      reasoning: "Reasoning",
    },
    save: "Save override",
    resetTitle: "Reset",
    resetDescription:
      "Delete data/prices.json and fall back to data/prices.default.json.",
    resetButton: "Reset to defaults",
  },
};

export default en;
