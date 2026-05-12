// Client-safe ROI math. Same plan catalog the server uses for storage,
// but the heavy "did you make your money back" arithmetic runs on the
// already-aggregated data the dashboard has in hand.

import type { Period, CustomRange } from "@/lib/types";

export type PlanLite = {
  id: string;
  vendor: string;
  name: string;
  monthlyUsd: number;
  // Forwarded from PlanDef.caps. Lives on PlanLite so the client
  // doesn't have to re-import the catalog. All four windows are
  // optional — most plans only publish a 5h or 30d figure.
  caps?: {
    per5h?: number;
    per24h?: number;
    per7d?: number;
    per30d?: number;
  };
};

export type RoiResult = {
  // Pro-rated subscription cost for the *visible period*. A month's
  // $200 plan costs $200/30 ≈ $6.67 for a single day, $46.67 for a
  // week, etc. — that's the bar to clear before you're "in profit".
  proratedUsd: number;
  // What the user would have paid pay-per-token for the same usage
  // (= agg.totals.costUsd of records in the period).
  apiSpendUsd: number;
  // apiSpend - prorated. Positive = made your money back, negative =
  // still under water for the period.
  netUsd: number;
  // apiSpend / prorated. 100% = break-even, 250% = used 2.5× the value.
  ratioPct: number;
  // Whole 10% increment past 100% — drives milestone encouragement
  // picker (0, 1, 2, ... corresponds to 100%, 110%, 120%, ...).
  milestoneBand: number;
};

// Period → "how many days does this view cover, today inclusive". Used
// to prorate the monthly subscription cost.
export function periodDays(period: Period, customRange?: CustomRange, now: Date = new Date()): number {
  switch (period) {
    case "today": {
      // Hours elapsed today, scaled to fraction of a day.
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return Math.max(1 / 24, (now.getTime() - start.getTime()) / 86_400_000);
    }
    case "24h":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return Math.max(1, (now.getTime() - start.getTime()) / 86_400_000);
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return Math.max(1, (now.getTime() - start.getTime()) / 86_400_000);
    }
    case "all":
      // Fall back to a year — "all-time ROI" mixes plans across time so
      // it's mostly a vanity number; we let the user eyeball it.
      return 365;
    case "custom": {
      if (!customRange) return 1;
      const f = customRange.from ? new Date(customRange.from).getTime() : null;
      const t = customRange.to ? new Date(customRange.to).getTime() : now.getTime();
      if (f == null) return 1;
      return Math.max(1, (t - f) / 86_400_000 + 1);
    }
  }
}

export function computeRoi(
  apiSpendUsd: number,
  plans: PlanLite[],
  days: number
): RoiResult {
  const monthlyTotal = plans.reduce((s, p) => s + p.monthlyUsd, 0);
  // 30-day month is the convention publishers price by; close enough
  // for the "did I break even" question we're answering.
  const proratedUsd = monthlyTotal * (days / 30);
  const netUsd = apiSpendUsd - proratedUsd;
  const ratioPct =
    proratedUsd <= 0 ? 0 : Math.round((apiSpendUsd / proratedUsd) * 100);
  // 100-109% → 0, 110-119% → 1, 120-129% → 2, ...
  const milestoneBand = ratioPct < 100 ? -1 : Math.floor((ratioPct - 100) / 10);
  return { proratedUsd, apiSpendUsd, netUsd, ratioPct, milestoneBand };
}
