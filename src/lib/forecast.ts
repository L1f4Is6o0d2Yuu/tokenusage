import type { DailyPoint } from "./types";

// Project a user's cost trajectory forward from their recent daily-cost
// history. Used to power the "按这节奏月底大约 $X" card on the dashboard.
//
// Two pieces:
//   1. Where are they currently trending? — last-N-day rolling mean.
//   2. Where will they end up by end-of-month? — current month-to-date
//      + remaining days × that mean.
//
// We deliberately don't fit a regression line. tokenusage usage tends to
// be spiky (one big session can dominate a week), and a linear fit on
// noisy data ends up confidently wrong. A trimmed mean is honest about
// "this is roughly your pace right now" without pretending to know the
// shape of next week.

export type Forecast = {
  // Calendar context.
  todayLocal: string; // YYYY-MM-DD in the same locale convention DailyPoint uses
  daysIntoMonth: number;
  daysLeftInMonth: number;
  // Pace estimate. Trimmed mean of the last `lookbackDays` of cost,
  // excluding the top/bottom 10% so a single $200 outlier session
  // doesn't drag everything skyward.
  paceUsdPerDay: number;
  lookbackDays: number;
  // Projected total for the current calendar month (month-to-date +
  // remaining days × paceUsdPerDay).
  monthEndProjectionUsd: number;
  monthToDateUsd: number;
  // Same calendar month last month, for a side-by-side delta. Null when
  // we don't have enough history yet.
  lastMonthTotalUsd: number | null;
  lastMonthSameDayUsd: number | null;
  // Confidence band. "low" when lookback < 3 days of data — we still
  // surface the number but the UI should soften the framing.
  confidence: "low" | "medium" | "high";
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function trimmedMean(values: number[], trim = 0.1): number {
  if (values.length === 0) return 0;
  if (values.length < 5) {
    // Not enough samples to trim — plain mean.
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * trim);
  const slice = sorted.slice(cut, sorted.length - cut);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function computeForecast(
  byDay: DailyPoint[],
  opts: { lookbackDays?: number; now?: Date } = {}
): Forecast {
  const lookbackDays = opts.lookbackDays ?? 14;
  const now = opts.now ?? new Date();

  const todayLocal = ymd(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysIntoMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysLeftInMonth = Math.max(0, daysInMonth - daysIntoMonth);

  // Index daily points by date for quick lookup.
  const byDate = new Map<string, DailyPoint>();
  for (const p of byDay) byDate.set(p.date, p);

  // Build the rolling lookback window (inclusive of today).
  const lookback: number[] = [];
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(year, month, daysIntoMonth - i);
    const key = ymd(d);
    lookback.push(byDate.get(key)?.costUsd ?? 0);
  }
  const paceUsdPerDay = trimmedMean(lookback);

  // Sum month-to-date from byDay (the dashboard's aggregation already
  // gives us all of it; here we just slice to the current calendar
  // month so the forecast lines up with what the user sees on the
  // monthly tab).
  let monthToDateUsd = 0;
  for (const p of byDay) {
    if (p.date >= ymd(new Date(year, month, 1)) && p.date <= todayLocal) {
      monthToDateUsd += p.costUsd;
    }
  }

  const monthEndProjectionUsd = monthToDateUsd + paceUsdPerDay * daysLeftInMonth;

  // Last month side-by-side.
  const lastMonthStart = ymd(new Date(year, month - 1, 1));
  const lastMonthEndDate = new Date(year, month, 0); // day 0 of this month = last day of last month
  const lastMonthEnd = ymd(lastMonthEndDate);
  const lastMonthSameDay = ymd(
    new Date(year, month - 1, Math.min(daysIntoMonth, lastMonthEndDate.getDate()))
  );
  let lastMonthTotalUsd = 0;
  let lastMonthSameDayUsd = 0;
  let lastMonthSampleCount = 0;
  for (const p of byDay) {
    if (p.date >= lastMonthStart && p.date <= lastMonthEnd) {
      lastMonthTotalUsd += p.costUsd;
      lastMonthSampleCount += 1;
      if (p.date <= lastMonthSameDay) {
        lastMonthSameDayUsd += p.costUsd;
      }
    }
  }

  // Non-zero days in the lookback window — the trimmed mean is only
  // meaningful when we've actually got a few real samples.
  const nonZeroLookback = lookback.filter((v) => v > 0).length;
  const confidence: Forecast["confidence"] =
    nonZeroLookback >= 7 ? "high" : nonZeroLookback >= 3 ? "medium" : "low";

  return {
    todayLocal,
    daysIntoMonth,
    daysLeftInMonth,
    paceUsdPerDay,
    lookbackDays,
    monthEndProjectionUsd,
    monthToDateUsd,
    lastMonthTotalUsd: lastMonthSampleCount > 0 ? lastMonthTotalUsd : null,
    lastMonthSameDayUsd: lastMonthSampleCount > 0 ? lastMonthSameDayUsd : null,
    confidence,
  };
}
