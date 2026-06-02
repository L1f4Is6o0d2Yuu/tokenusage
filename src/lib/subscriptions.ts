import "server-only";
import { openServerDb } from "./server-db";
import { isCloudflareRuntime } from "./runtime";

// Hard-coded catalog. Adding a new plan is a one-line change here —
// users see / pick from this list. Monthly USD is the sticker price;
// we don't try to track annual discounts because we're computing
// "did you make your money back this period" not "what does your
// invoice look like".

export type PlanId =
  | "claude-pro"
  | "claude-max-5x"
  | "claude-max-20x"
  | "claude-team"
  | "chatgpt-go"
  | "chatgpt-plus"
  | "chatgpt-pro"
  | "chatgpt-team"
  | "codex-go"
  | "codex-plus"
  | "codex-pro"
  | "cursor-pro"
  | "cursor-ultra"
  | "cursor-team"
  | "github-copilot-pro"
  | "github-copilot-business"
  | "github-copilot-enterprise"
  | "deepseek-pro"
  | "kimi-premium"
  | "qwen-plus"
  | "mimo-lite"
  | "mimo-standard"
  | "mimo-pro"
  | "mimo-max"
  | "google-ai-pro"
  | "perplexity-pro"
  | "windsurf-pro"
  | "replit-core"
  | "ms365-copilot";

export type PlanDef = {
  id: PlanId;
  vendor: string;
  name: string;
  monthlyUsd: number;
  // The model-name patterns that count toward this plan's "usage". When
  // computing ROI we sum cost only of records whose model matches one
  // of these regexes. A record's usage maps to *at most one* plan;
  // ambiguity gets resolved by listing the most specific plan first
  // in the catalog and short-circuiting on first match.
  models: RegExp[];
  // Best-effort message caps per rolling window, in *messages*
  // (matching how Anthropic / OpenAI talk about their limits in
  // public communications). Cap values are not authoritative —
  // providers tune them quarterly — but they're stable enough to
  // give the user a "you're at 60% of the 5h ceiling" hint.
  // Plans whose limits are credit-based (MiMo) or PAYG (DeepSeek
  // official) leave this undefined.
  caps?: {
    per5h?: number;
    per24h?: number;
    per7d?: number;
    per30d?: number;
  };
};

export const PLAN_CATALOG: PlanDef[] = [
  {
    id: "claude-team",
    vendor: "Anthropic",
    name: "Claude Team (per seat)",
    monthlyUsd: 30,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
    caps: { per5h: 45 },
  },
  {
    id: "claude-max-20x",
    vendor: "Anthropic",
    name: "Claude Max (20×)",
    monthlyUsd: 200,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
    caps: { per5h: 900, per7d: 5000 },
  },
  {
    id: "claude-max-5x",
    vendor: "Anthropic",
    name: "Claude Max (5×)",
    monthlyUsd: 100,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
    caps: { per5h: 225, per7d: 1250 },
  },
  {
    id: "claude-pro",
    vendor: "Anthropic",
    name: "Claude Pro",
    monthlyUsd: 20,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
    caps: { per5h: 45, per7d: 250 },
  },
  {
    id: "chatgpt-team",
    vendor: "OpenAI",
    name: "ChatGPT Team (per seat)",
    monthlyUsd: 30,
    models: [/^gpt-/i, /^o\d/i, /chat-latest/i],
    caps: { per5h: 200 },
  },
  {
    id: "chatgpt-pro",
    vendor: "OpenAI",
    name: "ChatGPT Pro",
    monthlyUsd: 200,
    models: [/^gpt-/i, /^o\d/i, /chat-latest/i],
    caps: { per5h: 5000 },
  },
  {
    id: "chatgpt-go",
    vendor: "OpenAI",
    name: "ChatGPT Go",
    monthlyUsd: 8,
    models: [/^gpt-/i, /^o\d/i, /chat-latest/i],
    caps: { per5h: 20 },
  },
  {
    id: "chatgpt-plus",
    vendor: "OpenAI",
    name: "ChatGPT Plus",
    monthlyUsd: 20,
    models: [/^gpt-/i, /^o\d/i, /chat-latest/i],
    caps: { per5h: 130 },
  },
  {
    id: "codex-pro",
    vendor: "OpenAI",
    name: "Codex Pro",
    monthlyUsd: 100,
    models: [/^gpt-/i, /^o\d/i, /codex/i],
    caps: { per5h: 750 },
  },
  {
    id: "codex-plus",
    vendor: "OpenAI",
    name: "Codex Plus",
    monthlyUsd: 20,
    models: [/^gpt-/i, /^o\d/i, /codex/i],
    caps: { per5h: 150 },
  },
  {
    id: "codex-go",
    vendor: "OpenAI",
    name: "Codex Go",
    monthlyUsd: 8,
    models: [/^gpt-/i, /^o\d/i, /codex/i],
    caps: { per5h: 30 },
  },
  {
    id: "cursor-ultra",
    vendor: "Cursor",
    name: "Cursor Ultra",
    monthlyUsd: 200,
    models: [/^claude-/i, /^gpt-/i, /sonnet/i, /opus/i],
    caps: { per30d: 5000 },
  },
  {
    id: "cursor-team",
    vendor: "Cursor",
    name: "Cursor Team (per seat)",
    monthlyUsd: 40,
    models: [/^claude-/i, /^gpt-/i, /sonnet/i, /opus/i],
    caps: { per30d: 500 },
  },
  {
    id: "cursor-pro",
    vendor: "Cursor",
    name: "Cursor Pro",
    monthlyUsd: 20,
    models: [/^claude-/i, /^gpt-/i, /sonnet/i, /opus/i],
    caps: { per30d: 500 },
  },
  {
    id: "github-copilot-enterprise",
    vendor: "GitHub",
    name: "Copilot Enterprise (per seat)",
    monthlyUsd: 39,
    models: [/^gpt-/i, /^claude-/i, /sonnet/i],
    caps: { per30d: 1000 },
  },
  {
    id: "github-copilot-business",
    vendor: "GitHub",
    name: "Copilot Business (per seat)",
    monthlyUsd: 19,
    models: [/^gpt-/i, /^claude-/i, /sonnet/i],
    caps: { per30d: 300 },
  },
  {
    id: "github-copilot-pro",
    vendor: "GitHub",
    name: "Copilot Pro",
    monthlyUsd: 10,
    models: [/^gpt-/i, /^claude-/i, /sonnet/i],
    caps: { per30d: 300 },
  },
  {
    id: "deepseek-pro",
    vendor: "DeepSeek",
    name: "DeepSeek Pro",
    monthlyUsd: 10,
    models: [/^deepseek/i],
  },
  {
    id: "kimi-premium",
    vendor: "Moonshot",
    name: "Kimi Premium",
    monthlyUsd: 14,
    models: [/^kimi/i, /^moonshot/i],
  },
  {
    id: "qwen-plus",
    vendor: "Alibaba",
    name: "通义千问 Plus",
    monthlyUsd: 8,
    models: [/^qwen/i],
  },
  // 小米 MiMo Token Plan — four tiers, RMB billed; USD here is the
  // sticker conversion at the time the catalog was written.
  {
    id: "mimo-max",
    vendor: "Xiaomi",
    name: "MiMo Max (¥659)",
    monthlyUsd: 100,
    models: [/mimo/i],
  },
  {
    id: "mimo-pro",
    vendor: "Xiaomi",
    name: "MiMo Pro (¥329)",
    monthlyUsd: 50,
    models: [/mimo/i],
  },
  {
    id: "mimo-standard",
    vendor: "Xiaomi",
    name: "MiMo Standard (¥99)",
    monthlyUsd: 16,
    models: [/mimo/i],
  },
  {
    id: "mimo-lite",
    vendor: "Xiaomi",
    name: "MiMo Lite (¥39)",
    monthlyUsd: 6,
    models: [/mimo/i],
  },
  // Other AI tools / chat plans the user might be paying for. These
  // don't necessarily emit token logs we can attribute usage to —
  // ROI counts the subscription as cost, with usage credit only if a
  // matching record appears. Still useful for tallying total burn.
  {
    id: "google-ai-pro",
    vendor: "Google",
    name: "Google AI Pro (Gemini Advanced)",
    monthlyUsd: 20,
    models: [/^gemini/i],
  },
  {
    id: "perplexity-pro",
    vendor: "Perplexity",
    name: "Perplexity Pro",
    monthlyUsd: 20,
    models: [/^gpt-/i, /^claude-/i, /sonnet/i, /opus/i],
  },
  {
    id: "windsurf-pro",
    vendor: "Codeium",
    name: "Windsurf Pro",
    monthlyUsd: 15,
    models: [/^claude-/i, /^gpt-/i, /sonnet/i],
  },
  {
    id: "replit-core",
    vendor: "Replit",
    name: "Replit Core",
    monthlyUsd: 25,
    models: [/^claude-/i, /^gpt-/i, /sonnet/i],
  },
  {
    id: "ms365-copilot",
    vendor: "Microsoft",
    name: "Microsoft 365 Copilot (per seat)",
    monthlyUsd: 30,
    models: [/^gpt-/i, /chat-latest/i],
  },
];

export const PLAN_BY_ID = new Map(PLAN_CATALOG.map((p) => [p.id, p]));

export function getPlan(id: string): PlanDef | undefined {
  return PLAN_BY_ID.get(id as PlanId);
}

// ─── DB helpers ──────────────────────────────────────────────────────────

export async function listUserSubscriptions(userId: number): Promise<PlanId[]> {
  if (isCloudflareRuntime()) {
    const { listUserSubscriptionsD1 } = await import("./cloudflare-subscriptions");
    return listUserSubscriptionsD1(userId);
  }
  const db = openServerDb();
  try {
    const rows = db
      .prepare(
        `SELECT plan FROM user_subscriptions
         WHERE user_id = ? ORDER BY started_at ASC`
      )
      .all(userId) as Array<{ plan: string }>;
    return rows
      .map((r) => r.plan as PlanId)
      .filter((id) => PLAN_BY_ID.has(id));
  } finally {
    db.close();
  }
}

export async function setUserSubscriptions(userId: number, plans: PlanId[]): Promise<void> {
  if (isCloudflareRuntime()) {
    const { setUserSubscriptionsD1 } = await import("./cloudflare-subscriptions");
    return setUserSubscriptionsD1(userId, plans);
  }
  // Replace the user's set in one txn — simpler than diff-then-apply.
  // Also stamps `subscriptions_setup_at` so the welcome gate doesn't
  // re-fire on the next dashboard visit even when the user submits an
  // empty set (i.e. explicitly skipped).
  const valid = plans.filter((p) => PLAN_BY_ID.has(p));
  const db = openServerDb();
  try {
    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM user_subscriptions WHERE user_id = ?`).run(userId);
      const ins = db.prepare(
        `INSERT INTO user_subscriptions (user_id, plan, started_at)
         VALUES (?, ?, ?)`
      );
      const now = Date.now();
      for (const p of valid) ins.run(userId, p, now);
      db.prepare(
        `UPDATE users SET subscriptions_setup_at = ? WHERE id = ?`
      ).run(now, userId);
    });
    txn();
  } finally {
    db.close();
  }
}

// Has the user been through the first-time arsenal-picking screen
// (regardless of whether they actually picked any plans)? Drives the
// welcome redirect on the dashboard.
export async function hasFinishedSubscriptionsSetup(userId: number): Promise<boolean> {
  if (isCloudflareRuntime()) {
    const { hasFinishedSubscriptionsSetupD1 } = await import("./cloudflare-subscriptions");
    return hasFinishedSubscriptionsSetupD1(userId);
  }
  const db = openServerDb();
  try {
    const row = db
      .prepare(`SELECT subscriptions_setup_at AS t FROM users WHERE id = ?`)
      .get(userId) as { t: number | null } | undefined;
    return row?.t != null;
  } finally {
    db.close();
  }
}
