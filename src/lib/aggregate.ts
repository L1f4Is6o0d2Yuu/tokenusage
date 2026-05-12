import type {
  Aggregation,
  CustomRange,
  DailyPoint,
  Granularity,
  ModelBreakdownRow,
  Period,
  UsageRecord,
} from "@/lib/types";

function parseLocalDate(s: string, endOfDay = false): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function periodWindow(
  period: Period,
  now: Date = new Date(),
  custom?: CustomRange
): { start: number | null; end: number } {
  const nowMs = now.getTime();
  if (period === "all") return { start: null, end: nowMs };
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: nowMs };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start: start.getTime(), end: nowMs };
  }
  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { start: start.getTime(), end: nowMs };
  }
  if (period === "custom") {
    const start = custom?.from ? parseLocalDate(custom.from, false) : null;
    const end = custom?.to ? parseLocalDate(custom.to, true) : nowMs;
    return { start, end: end ?? nowMs };
  }
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  return { start: nowMs - days * 24 * 60 * 60 * 1000, end: nowMs };
}

export function filterByPeriod(
  records: UsageRecord[],
  period: Period,
  custom?: CustomRange
): UsageRecord[] {
  const { start, end } = periodWindow(period, new Date(), custom);
  // Sessions can span hours or days (a Claude Code session that runs
  // 11pm → 1am should count toward "today" too). Include any session
  // whose [startedAt, endedAt] interval *overlaps* the period window.
  // Token attribution within the overlap is handled in aggregate().
  return records.filter((r) => {
    const sessionEnd = r.endedAt ?? r.startedAt;
    if (r.startedAt > end) return false;
    if (start != null && sessionEnd < start) return false;
    return true;
  });
}

// Decide bucket size for the trend chart. Short windows (today / last
// 24h) get hour buckets so the user can see intra-day shape; day
// buckets are great up to ~3 months; beyond that flip to month buckets
// or the x-axis turns unreadable.
export function pickGranularity(
  records: UsageRecord[],
  period: Period
): Granularity {
  if (period === "today" || period === "24h") return "hour";
  if (period === "year") return "month";
  if (period === "all") {
    if (records.length === 0) return "day";
    let min = records[0].startedAt;
    let max = records[0].startedAt;
    for (const r of records) {
      if (r.startedAt < min) min = r.startedAt;
      if (r.startedAt > max) max = r.startedAt;
    }
    return max - min > 90 * 24 * 60 * 60 * 1000 ? "month" : "day";
  }
  return "day";
}

// All bucket keys are derived from the runtime's *local* clock. On the
// server we get UTC; on the client we get the user's actual timezone.
// Aggregation moved client-side specifically so hour buckets line up
// with the user's wall clock — a "Today" chart that shows the user's
// 0-24 in their own TZ.
function bucketKey(ts: number, g: Granularity): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (g === "month") return `${y}-${m}-01`;
  const day = String(d.getDate()).padStart(2, "0");
  if (g === "hour") {
    const hh = String(d.getHours()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:00`;
  }
  return `${y}-${m}-${day}`;
}

function bucketStartTime(ts: number, g: Granularity): number {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  if (g === "hour") return d.getTime();
  d.setHours(0);
  if (g === "day") return d.getTime();
  d.setDate(1);
  return d.getTime();
}

function nextBucketTime(ts: number, g: Granularity): number {
  const d = new Date(ts);
  if (g === "hour") {
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.getTime();
  }
  if (g === "day") {
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Slice a session into per-bucket fractions, keeping only buckets that
// fall inside [windowStart, windowEnd]. Sum of returned fractions =
// the portion of the session's lifetime that's actually visible in
// the chart's window — i.e. exactly what we want to weight its tokens
// by when computing aggregates.
function distributeAcrossBuckets(
  startedAt: number,
  endedAt: number,
  g: Granularity,
  window?: { start: number | null; end: number }
): Array<{ key: string; fraction: number }> {
  const start = startedAt;
  // Minimum span of 1ms keeps the division well-defined for sessions
  // that recorded a single turn (startedAt == endedAt).
  const end = Math.max(endedAt, startedAt + 1);
  const span = end - start;
  const out: Array<{ key: string; fraction: number }> = [];
  let cursor = bucketStartTime(start, g);
  // Hard cap on iterations so a malformed record can't lock the page.
  // 8760 (1 year of hours) is well past anything we'd render.
  let safety = 8760;
  while (cursor < end && safety-- > 0) {
    const next = nextBucketTime(cursor, g);
    const overlap = Math.max(0, Math.min(end, next) - Math.max(start, cursor));
    if (overlap > 0) {
      // Bucket center is approximated by `cursor` for the window test
      // (cursor = bucket start). A bucket counts as "in window" if
      // its start is on/after windowStart and on/before windowEnd.
      const inWindow =
        (window?.start == null || cursor >= window.start) &&
        (window == null || cursor <= window.end);
      if (inWindow) {
        out.push({ key: bucketKey(cursor, g), fraction: overlap / span });
      }
    }
    cursor = next;
  }
  return out;
}

export function aggregate(
  records: UsageRecord[],
  granularity: Granularity = "day",
  // Window covered by the chart. Used to pre-seed empty buckets for hour
  // granularity so a quiet hour doesn't get collapsed off the x-axis
  // (recharts would otherwise put the next non-zero bucket right next to
  // the previous one and the time spacing reads as uneven).
  window?: { start: number | null; end: number }
): Aggregation {
  const totals = {
    records: records.length,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    costKnown: true,
  };

  const modelMap = new Map<string, ModelBreakdownRow>();
  const bucketMap = new Map<string, DailyPoint>();

  for (const r of records) {
    const totalTokens =
      r.inputTokens +
      r.outputTokens +
      r.cacheReadTokens +
      r.cacheWriteTokens +
      r.reasoningTokens;

    // Slice the session across whatever buckets it touches inside the
    // window. `inWindowFraction` is the share of session lifetime
    // visible in the chart — it weights *all* aggregates so a session
    // that ran 11pm→1am and we're viewing "today" only counts the
    // 0:00–1:00 slice (roughly 50% of its tokens).
    const dist = distributeAcrossBuckets(
      r.startedAt,
      r.endedAt ?? r.startedAt,
      granularity,
      window
    );
    const inWindowFraction = dist.reduce((s, x) => s + x.fraction, 0);
    // If the session has no overlap with the visible window (its
    // buckets all fell outside), skip it entirely — it shouldn't
    // contribute to totals or model rows for this view.
    if (inWindowFraction === 0) continue;

    totals.inputTokens += r.inputTokens * inWindowFraction;
    totals.outputTokens += r.outputTokens * inWindowFraction;
    totals.cacheReadTokens += r.cacheReadTokens * inWindowFraction;
    totals.cacheWriteTokens += r.cacheWriteTokens * inWindowFraction;
    totals.reasoningTokens += r.reasoningTokens * inWindowFraction;
    totals.totalTokens += totalTokens * inWindowFraction;

    if (r.costUsd != null) totals.costUsd += r.costUsd * inWindowFraction;
    else if (totalTokens > 0) totals.costKnown = false;

    const modelKey = `${r.provider}::${r.model ?? "unknown"}`;
    let row = modelMap.get(modelKey);
    if (!row) {
      row = {
        provider: r.provider,
        model: r.model ?? "unknown",
        records: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        costKnown: true,
      };
      modelMap.set(modelKey, row);
    }
    // `records` counts each session once even when prorated — counting
    // 0.5 sessions reads weirdly. Token sums get the proration so the
    // breakdown numbers tie back to the totals.
    row.records += 1;
    row.inputTokens += r.inputTokens * inWindowFraction;
    row.outputTokens += r.outputTokens * inWindowFraction;
    row.cacheReadTokens += r.cacheReadTokens * inWindowFraction;
    row.cacheWriteTokens += r.cacheWriteTokens * inWindowFraction;
    row.reasoningTokens += r.reasoningTokens * inWindowFraction;
    row.totalTokens += totalTokens * inWindowFraction;
    if (r.costUsd != null) row.costUsd += r.costUsd * inWindowFraction;
    else if (totalTokens > 0) row.costKnown = false;

    for (const { key, fraction } of dist) {
      let p = bucketMap.get(key);
      if (!p) {
        p = { date: key, totalTokens: 0, costUsd: 0 };
        bucketMap.set(key, p);
      }
      p.totalTokens += totalTokens * fraction;
      if (r.costUsd != null) p.costUsd += r.costUsd * fraction;
    }
  }

  // Pre-seed hour buckets across the requested window so empty hours
  // render as zero points (preserving uniform x-axis spacing) instead
  // of just disappearing from the series.
  if (granularity === "hour" && window) {
    const start = window.start ?? records.reduce(
      (m, r) => (r.startedAt < m ? r.startedAt : m),
      window.end
    );
    const dStart = new Date(start);
    dStart.setMinutes(0, 0, 0);
    const stepMs = 60 * 60 * 1000;
    for (let t = dStart.getTime(); t <= window.end; t += stepMs) {
      const k = bucketKey(t, "hour");
      if (!bucketMap.has(k)) {
        bucketMap.set(k, { date: k, totalTokens: 0, costUsd: 0 });
      }
    }
  }

  const byModel = [...modelMap.values()].sort((a, b) => b.totalTokens - a.totalTokens);
  const byDay = [...bucketMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return { totals, byModel, byDay };
}
