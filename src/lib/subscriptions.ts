import "server-only";
import { openServerDb } from "./server-db";

// Hard-coded catalog. Adding a new plan is a one-line change here —
// users see / pick from this list. Monthly USD is the sticker price;
// we don't try to track annual discounts because we're computing
// "did you make your money back this period" not "what does your
// invoice look like".

export type PlanId =
  | "claude-pro"
  | "claude-max-5x"
  | "claude-max-20x"
  | "chatgpt-plus"
  | "chatgpt-pro"
  | "codex-plus"
  | "codex-pro"
  | "cursor-pro"
  | "github-copilot-pro"
  | "deepseek-pro";

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
};

export const PLAN_CATALOG: PlanDef[] = [
  {
    id: "claude-max-20x",
    vendor: "Anthropic",
    name: "Claude Max (20×)",
    monthlyUsd: 200,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
  },
  {
    id: "claude-max-5x",
    vendor: "Anthropic",
    name: "Claude Max (5×)",
    monthlyUsd: 100,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
  },
  {
    id: "claude-pro",
    vendor: "Anthropic",
    name: "Claude Pro",
    monthlyUsd: 20,
    models: [/^claude-/i, /opus/i, /sonnet/i, /haiku/i],
  },
  {
    id: "chatgpt-pro",
    vendor: "OpenAI",
    name: "ChatGPT Pro",
    monthlyUsd: 200,
    models: [/^gpt-/i, /^o\d/i, /chat-latest/i],
  },
  {
    id: "chatgpt-plus",
    vendor: "OpenAI",
    name: "ChatGPT Plus",
    monthlyUsd: 20,
    models: [/^gpt-/i, /^o\d/i, /chat-latest/i],
  },
  {
    id: "codex-pro",
    vendor: "OpenAI",
    name: "Codex Pro",
    monthlyUsd: 200,
    models: [/^gpt-/i, /^o\d/i, /codex/i],
  },
  {
    id: "codex-plus",
    vendor: "OpenAI",
    name: "Codex Plus",
    monthlyUsd: 20,
    models: [/^gpt-/i, /^o\d/i, /codex/i],
  },
  {
    id: "cursor-pro",
    vendor: "Cursor",
    name: "Cursor Pro",
    monthlyUsd: 20,
    models: [/^claude-/i, /^gpt-/i, /sonnet/i, /opus/i],
  },
  {
    id: "github-copilot-pro",
    vendor: "GitHub",
    name: "Copilot Pro",
    monthlyUsd: 10,
    models: [/^gpt-/i, /^claude-/i, /sonnet/i],
  },
  {
    id: "deepseek-pro",
    vendor: "DeepSeek",
    name: "DeepSeek Pro",
    monthlyUsd: 10,
    models: [/^deepseek/i],
  },
];

const PLAN_BY_ID = new Map(PLAN_CATALOG.map((p) => [p.id, p]));

export function getPlan(id: string): PlanDef | undefined {
  return PLAN_BY_ID.get(id as PlanId);
}

// ─── DB helpers ──────────────────────────────────────────────────────────

export function listUserSubscriptions(userId: number): PlanId[] {
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

export function setUserSubscriptions(userId: number, plans: PlanId[]): void {
  // Replace the user's set in one txn — simpler than diff-then-apply.
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
    });
    txn();
  } finally {
    db.close();
  }
}
