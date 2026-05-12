// Picker logic for the encouragement corpus. The actual content lives
// in encouragement-corpus.ts so this file stays a thin lookup-and-fill.
//
//   * Daily corpus indexed by floor(spend) — $1 granularity to $100,
//     then a single "you're scaring the CFO" bucket past $100.
//   * ROI corpus indexed by a non-linear band map that gets coarser as
//     the ratio climbs (100→105→110→...→2500→5000→10000+%).
//
// Hash key includes `period` so the same ROI band shows different
// lines on "7d" vs "30d" — switching tabs feels like turning the page
// of an essay, not refreshing the same one.

import type { PlanLite } from "@/lib/roi-client";
import {
  DAILY_ZH,
  DAILY_EN,
  ROI_ZH,
  ROI_EN,
  HOURS_TAUNT_ZH,
  TOKEN_TAUNT_ZH,
} from "@/lib/encouragement-corpus";

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// The caller passes the seed in `userKey` — typically composed as
// `${userId}:${mountSeed}` where mountSeed is server-generated per
// request. Doing it that way keeps SSR and client hydration on the
// same string (no Date.now() / performance.now() drift) and rolls
// fresh on every full page refresh.

function interp(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function primaryPlan(plans: PlanLite[]): PlanLite | null {
  if (plans.length === 0) return null;
  return plans.reduce((max, p) => (p.monthlyUsd > max.monthlyUsd ? p : max), plans[0]);
}

function primaryVendor(plans: PlanLite[]): string {
  return primaryPlan(plans)?.vendor ?? "AI";
}

// Daily band index. $1 step under $50, then $5 step to $100, then $10
// step. The corpus mirrors that shape so each row is roughly one band.
function dailyBandIndex(spend: number, maxLen: number): number {
  let idx: number;
  if (spend < 50) idx = Math.max(0, Math.floor(spend));
  else if (spend < 100) idx = 50 + Math.floor((spend - 50) / 5);
  else idx = 60 + Math.floor((spend - 100) / 10);
  return Math.min(idx, maxLen - 1);
}

// ROI band index. Coarsens as we climb so 200% / 250% don't share a
// pool with 1000% / 5000%.
function roiBandIndex(ratioPct: number, maxLen: number): number {
  if (ratioPct < 100) return -1;
  let idx: number;
  if (ratioPct < 130) idx = Math.floor((ratioPct - 100) / 5); // 0..5
  else if (ratioPct < 150) idx = 6 + Math.floor((ratioPct - 130) / 10); // 6..7
  else if (ratioPct < 200) idx = 8 + Math.floor((ratioPct - 150) / 25); // 8..9
  else if (ratioPct < 300) idx = 10 + Math.floor((ratioPct - 200) / 50); // 10..11
  else if (ratioPct < 500) idx = 12 + Math.floor((ratioPct - 300) / 100); // 12..13
  else if (ratioPct < 1000) idx = 14 + Math.floor((ratioPct - 500) / 250); // 14..15
  else if (ratioPct < 2000) idx = 16;
  else if (ratioPct < 5000) idx = 17;
  else if (ratioPct < 10000) idx = 18;
  else idx = 19;
  return Math.min(idx, maxLen - 1);
}

export type EncouragementMessage = {
  text: string;
  tone: "roast" | "tease" | "shade" | "celebration";
};

export function pickDailyTaunt(
  apiSpendUsd: number,
  plans: PlanLite[],
  locale: string,
  userKey: number | string,
  period: string = "today"
): EncouragementMessage | null {
  const langKey = locale.startsWith("zh") ? "zh" : "en";
  const lib = langKey === "zh" ? DAILY_ZH : DAILY_EN;
  if (lib.length === 0) return null;

  const bandIdx = dailyBandIndex(apiSpendUsd, lib.length);
  const pool = lib[bandIdx];
  if (!pool || pool.length === 0) return null;

  const plan = primaryPlan(plans);
  const monthly = plan?.monthlyUsd ?? 0;
  const dailyTarget = monthly / 30;
  const remaining = Math.max(0, dailyTarget - apiSpendUsd);

  // Including `period` so 24h and today render different lines for the
  // same band — switching tabs reads as fresh content.
  const pickIdx = djb2(`${userKey}:${period}:${bandIdx}`) % pool.length;
  const tmpl = pool[pickIdx];
  const text = interp(tmpl, {
    plan: plan?.name ?? (langKey === "zh" ? "套餐" : "your plan"),
    vendor: plan?.vendor ?? "AI",
    monthly: fmtUsd(monthly),
    monthly_coffees: Math.round(monthly / 5).toString(),
    spend: fmtUsd(apiSpendUsd),
    remaining: fmtUsd(remaining),
  });

  // Tones map by band threshold, not by line. Roast = under daily
  // breakeven, tease = catching up, shade = past CFO's comfort zone.
  const tone: EncouragementMessage["tone"] =
    bandIdx <= 5 ? "roast" : bandIdx <= 30 ? "tease" : "shade";
  return { text, tone };
}

export function pickRoiLine(
  ratioPct: number,
  netUsd: number,
  plans: PlanLite[],
  locale: string,
  userKey: number | string,
  period: string = "7d"
): EncouragementMessage | null {
  const langKey = locale.startsWith("zh") ? "zh" : "en";
  const bands = langKey === "zh" ? ROI_ZH : ROI_EN;
  const bandIdx = roiBandIndex(ratioPct, bands.length);
  if (bandIdx < 0) return null;
  const pool = bands[bandIdx];
  if (!pool || pool.length === 0) return null;

  const pickIdx = djb2(`${userKey}:${period}:${bandIdx}`) % pool.length;
  const tmpl = pool[pickIdx];
  const text = interp(tmpl, {
    vendor: primaryVendor(plans),
    net: fmtUsd(Math.max(0, netUsd)),
  });
  const tone: EncouragementMessage["tone"] =
    bandIdx <= 1 ? "celebration" : bandIdx <= 7 ? "tease" : "shade";
  return { text, tone };
}

// ─── Hours panel ─────────────────────────────────────────────────────
// Bands by avg hours/day (0..8). Even though the source records can
// over-count when sessions span the period boundary, we still bucket
// by the raw avg — the over-count itself reads as part of the joke.
function hoursBandIndex(avgPerDay: number): number {
  if (avgPerDay < 1) return 0;
  if (avgPerDay < 3) return 1;
  if (avgPerDay < 5) return 2;
  if (avgPerDay < 7) return 3;
  if (avgPerDay < 9) return 4;
  if (avgPerDay < 12) return 5;
  if (avgPerDay < 16) return 6;
  if (avgPerDay < 20) return 7;
  return 8;
}

export function pickHoursTaunt(
  totalHours: number,
  periodDays: number,
  locale: string,
  userKey: number | string,
  period: string = "7d"
): string | null {
  if (!locale.startsWith("zh")) return null; // ZH-only for now
  const safeDays = Math.max(1, periodDays);
  const hpd = totalHours / safeDays;
  const bandIdx = hoursBandIndex(hpd);
  const pool = HOURS_TAUNT_ZH[bandIdx];
  if (!pool || pool.length === 0) return null;
  const pickIdx = djb2(`${userKey}:${period}:hours:${bandIdx}`) % pool.length;
  return interp(pool[pickIdx], {
    hours: `${totalHours.toFixed(0)}`,
    hpd: hpd >= 10 ? hpd.toFixed(0) : hpd.toFixed(1),
  });
}

// ─── Token panel ─────────────────────────────────────────────────────
// Bands by total tokens.
function tokenBandIndex(totalTokens: number): number {
  if (totalTokens < 1_000_000) return 0;
  if (totalTokens < 10_000_000) return 1;
  if (totalTokens < 100_000_000) return 2;
  if (totalTokens < 1_000_000_000) return 3;
  if (totalTokens < 5_000_000_000) return 4;
  if (totalTokens < 50_000_000_000) return 5;
  return 6;
}

// Human-readable comparison. ~730K tokens per 《红楼梦》 (about 730K
// Chinese characters; cl100k_base hits roughly 1 token per CJK char).
// Rotates between books based on a hash so the same band shows
// different comparisons on different opens.
export function tokenComparison(
  totalTokens: number,
  userKey: number | string,
  period: string
): string {
  if (totalTokens < 100_000) return "≈ 几篇朋友圈";
  const refs: { perToken: number; label: string }[] = [
    { perToken: 730_000, label: "《红楼梦》" },
    { perToken: 880_000, label: "《三体》全集" },
    { perToken: 600_000, label: "《三国演义》" },
    { perToken: 3_000_000, label: "《资治通鉴》" },
    { perToken: 7_000_000, label: "《鲁迅全集》" },
  ];
  const pick = refs[djb2(`${userKey}:${period}:tokenref`) % refs.length];
  const n = totalTokens / pick.perToken;
  const num =
    n < 10
      ? n.toFixed(1)
      : n < 1_000
        ? Math.round(n).toLocaleString()
        : n < 1_000_000
          ? `${(n / 1_000).toFixed(1)}k`
          : `${(n / 1_000_000).toFixed(1)}M`;
  return `≈ ${num} 套 ${pick.label}`;
}

export function pickTokenTaunt(
  totalTokens: number,
  locale: string,
  userKey: number | string,
  period: string = "7d"
): string | null {
  if (!locale.startsWith("zh")) return null;
  const bandIdx = tokenBandIndex(totalTokens);
  const pool = TOKEN_TAUNT_ZH[bandIdx];
  if (!pool || pool.length === 0) return null;
  const pickIdx = djb2(`${userKey}:${period}:tok:${bandIdx}`) % pool.length;
  return interp(pool[pickIdx], {
    tokens: formatTokensZh(totalTokens),
  });
}

function formatTokensZh(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// Backward-compat shim — old call sites that took just (band, locale, key).
export function pickEncouragement(
  band: number,
  locale: string,
  userKey: string | number
): string | null {
  // Map old 10% band to a synthetic ratioPct so the new picker can
  // route it.
  const ratioPct = 100 + band * 10;
  const msg = pickRoiLine(ratioPct, 0, [], locale, userKey, "legacy");
  return msg?.text ?? null;
}
