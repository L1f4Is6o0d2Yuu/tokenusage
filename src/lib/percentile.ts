// Vibes-based industry reference distribution for AI-augmented
// developer per-day usage. *Not* a scientific benchmark — calibrated
// against community signal (Hacker News threads, Cursor / Anthropic
// engineering blogs, Twitter "I burn $X/day" anecdotes from 2025-2026).
//
// Purpose: give users a directional "how heavy am I really?" reading
// in the dashboard + share poster. Honest framing in the UI: "行业
// 估值参考" / "vibes-based". Not source-cited; updates as we get
// better data.
//
// Two distributions tracked separately because $ and tokens diverge
// at the high end — heavy cache-write users burn 10× more tokens
// per dollar than heavy reasoners.

type Breakpoint = { pct: number; value: number };

// $ per day (averaged over the displayed period)
const USD_PER_DAY: Breakpoint[] = [
  { pct: 10, value: 0.5 },
  { pct: 25, value: 2 },
  { pct: 50, value: 8 },
  { pct: 75, value: 30 },
  { pct: 90, value: 100 },
  { pct: 95, value: 300 },
  { pct: 99, value: 800 },
];

// Total tokens per day (input + output + cache, averaged)
const TOKENS_PER_DAY: Breakpoint[] = [
  { pct: 10, value: 50_000 },
  { pct: 25, value: 500_000 },
  { pct: 50, value: 5_000_000 },
  { pct: 75, value: 50_000_000 },
  { pct: 90, value: 300_000_000 },
  { pct: 95, value: 1_000_000_000 },
  { pct: 99, value: 3_000_000_000 },
];

// Hours per day of actual keyboard time on AI-augmented coding
const HOURS_PER_DAY: Breakpoint[] = [
  { pct: 10, value: 0.2 },
  { pct: 25, value: 0.8 },
  { pct: 50, value: 2 },
  { pct: 75, value: 4 },
  { pct: 90, value: 7 },
  { pct: 95, value: 10 },
  { pct: 99, value: 15 },
];

function interpolate(value: number, dist: Breakpoint[]): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= dist[0].value) {
    return (value / dist[0].value) * dist[0].pct;
  }
  for (let i = 1; i < dist.length; i++) {
    const lo = dist[i - 1];
    const hi = dist[i];
    if (value <= hi.value) {
      const t = (value - lo.value) / (hi.value - lo.value);
      return lo.pct + t * (hi.pct - lo.pct);
    }
  }
  // Above the top breakpoint — soft asymptote. Each doubling past
  // p99 adds 0.2 percentile points, so realistic 10× p99 → ~99.7%.
  const last = dist[dist.length - 1];
  const overage = Math.log2(value / last.value);
  return Math.min(99.99, last.pct + overage * 0.2);
}

export function spendPercentile(usdPerDay: number): number {
  return interpolate(usdPerDay, USD_PER_DAY);
}

export function tokenPercentile(tokensPerDay: number): number {
  return interpolate(tokensPerDay, TOKENS_PER_DAY);
}

export function hoursPercentile(hoursPerDay: number): number {
  return interpolate(hoursPerDay, HOURS_PER_DAY);
}

// Tier key that maps to the i18n compare.tiers.<key> slot. Use
// tierLabel() to get a (key + color) pair; the UI layer reads the
// localized string from the dictionary. SharePoster keeps a CN
// fallback baked in since the poster corpus is CN-only anyway.
export type TierKey =
  | "buddhist"
  | "normal"
  | "heavy"
  | "grindPrep"
  | "grind"
  | "topGrind"
  | "blackHole";

export type TierColor = "mute" | "ok" | "warn" | "danger";

export function tierLabel(pct: number): {
  key: TierKey;
  color: TierColor;
} {
  if (pct < 25) return { key: "buddhist", color: "mute" };
  if (pct < 50) return { key: "normal", color: "mute" };
  if (pct < 75) return { key: "heavy", color: "ok" };
  if (pct < 90) return { key: "grindPrep", color: "warn" };
  if (pct < 95) return { key: "grind", color: "warn" };
  if (pct < 99) return { key: "topGrind", color: "danger" };
  return { key: "blackHole", color: "danger" };
}

// CN fallback for callers that don't have an i18n dictionary handy
// (e.g., the share poster, which is CN-targeted regardless of the
// user's UI locale). Mirrors the dictionary's compare.tiers block.
export const TIER_LABEL_ZH: Record<TierKey, string> = {
  buddhist: "佛系",
  normal: "正常",
  heavy: "重度",
  grindPrep: "卷王预备",
  grind: "卷王",
  topGrind: "顶流卷王",
  blackHole: "黑洞级",
};

// Reference points exposed for the UI to show under the bar
// ("p50 $8/天 · p90 $100/天 · p99 $800/天").
export function spendReference(): { p50: number; p90: number; p99: number } {
  return { p50: 8, p90: 100, p99: 800 };
}
