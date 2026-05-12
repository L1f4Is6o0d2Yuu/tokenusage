import type { UsageRecord } from "@/lib/types";

// Rolling-window usage rollups.
//
// Anthropic Pro/Max 5h + weekly caps, OpenAI's per-tier limits, etc.
// aren't queryable from any public API — but we *do* have every
// session record locally, so we can derive "how much have you burned
// in the last 5 hours" without asking anyone. The user can eyeball
// proximity to the (un-knowable, fluctuating) cap themselves.
//
// We treat a session whose interval [startedAt, endedAt] overlaps the
// window as contributing its tokens prorated by the overlap fraction —
// same proration logic as `aggregate()` for window slices, so the 5h
// number can't drift from the daily total.

export type LimitWindow = {
  // Wall-clock duration of the window in milliseconds.
  durationMs: number;
  // Sum of all token kinds (input + output + cache + reasoning).
  tokens: number;
  // Sessions whose interval overlaps any part of the window.
  sessions: number;
  // Sum of `apiCallCount` for those sessions — closer to Anthropic's
  // "messages per 5h" framing than raw tokens.
  messages: number;
  // Same window expressed in cost USD (best-effort).
  costUsd: number;
};

// Stock windows we expose by default. Add more by editing the
// rendered panel — the math itself is parameterized.
export const STOCK_WINDOWS = [
  { id: "5h", labelKey: "fiveHours", durationMs: 5 * 60 * 60 * 1000 },
  { id: "24h", labelKey: "day", durationMs: 24 * 60 * 60 * 1000 },
  { id: "7d", labelKey: "week", durationMs: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", labelKey: "month", durationMs: 30 * 24 * 60 * 60 * 1000 },
] as const;

function tokensFor(r: UsageRecord): number {
  return (
    r.inputTokens +
    r.outputTokens +
    r.cacheReadTokens +
    r.cacheWriteTokens +
    r.reasoningTokens
  );
}

export function computeLimitWindow(
  records: UsageRecord[],
  durationMs: number,
  now: number = Date.now()
): LimitWindow {
  const start = now - durationMs;
  let tokens = 0;
  let messages = 0;
  let sessions = 0;
  let costUsd = 0;
  for (const r of records) {
    const end = r.endedAt ?? r.startedAt;
    if (end < start) continue;
    if (r.startedAt > now) continue;
    // Prorate by overlap fraction.
    const sStart = r.startedAt;
    const sEnd = Math.max(r.startedAt + 1, end);
    const span = sEnd - sStart;
    const overlap = Math.max(0, Math.min(sEnd, now) - Math.max(sStart, start));
    const frac = overlap / span;
    tokens += tokensFor(r) * frac;
    messages += (r.apiCallCount ?? 0) * frac;
    costUsd += (r.costUsd ?? 0) * frac;
    sessions += 1;
  }
  return { durationMs, tokens, sessions, messages, costUsd };
}

export function computeAllLimitWindows(
  records: UsageRecord[],
  now: number = Date.now()
): Record<string, LimitWindow> {
  const out: Record<string, LimitWindow> = {};
  for (const w of STOCK_WINDOWS) {
    out[w.id] = computeLimitWindow(records, w.durationMs, now);
  }
  return out;
}
