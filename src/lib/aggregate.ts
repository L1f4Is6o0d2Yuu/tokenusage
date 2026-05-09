import type {
  Aggregation,
  DailyPoint,
  ModelBreakdownRow,
  Period,
  UsageRecord,
} from "@/lib/types";

export function periodWindow(period: Period, now: Date = new Date()): {
  start: number | null;
  end: number;
} {
  const end = now.getTime();
  if (period === "all") return { start: null, end };
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end };
  }
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  return { start: end - days * 24 * 60 * 60 * 1000, end };
}

export function filterByPeriod(records: UsageRecord[], period: Period): UsageRecord[] {
  const { start, end } = periodWindow(period);
  return records.filter((r) => {
    if (r.startedAt > end) return false;
    if (start != null && r.startedAt < start) return false;
    return true;
  });
}

function dayKey(ts: number): string {
  // Local-day bucketing — matches what users see on their machine.
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function aggregate(records: UsageRecord[]): Aggregation {
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
  const dayMap = new Map<string, DailyPoint>();

  for (const r of records) {
    const totalTokens =
      r.inputTokens +
      r.outputTokens +
      r.cacheReadTokens +
      r.cacheWriteTokens +
      r.reasoningTokens;

    totals.inputTokens += r.inputTokens;
    totals.outputTokens += r.outputTokens;
    totals.cacheReadTokens += r.cacheReadTokens;
    totals.cacheWriteTokens += r.cacheWriteTokens;
    totals.reasoningTokens += r.reasoningTokens;
    totals.totalTokens += totalTokens;

    if (r.costUsd != null) totals.costUsd += r.costUsd;
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
    row.records += 1;
    row.inputTokens += r.inputTokens;
    row.outputTokens += r.outputTokens;
    row.cacheReadTokens += r.cacheReadTokens;
    row.cacheWriteTokens += r.cacheWriteTokens;
    row.reasoningTokens += r.reasoningTokens;
    row.totalTokens += totalTokens;
    if (r.costUsd != null) row.costUsd += r.costUsd;
    else if (totalTokens > 0) row.costKnown = false;

    const k = dayKey(r.startedAt);
    let p = dayMap.get(k);
    if (!p) {
      p = { date: k, totalTokens: 0, costUsd: 0 };
      dayMap.set(k, p);
    }
    p.totalTokens += totalTokens;
    if (r.costUsd != null) p.costUsd += r.costUsd;
  }

  const byModel = [...modelMap.values()].sort((a, b) => b.totalTokens - a.totalTokens);
  const byDay = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return { totals, byModel, byDay };
}
