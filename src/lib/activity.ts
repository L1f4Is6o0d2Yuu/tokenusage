// Activity inference + live-session selection. Both run pure-client
// in the dashboard so the server doesn't get involved.

import type { UsageRecord } from "@/lib/types";

// A session is "live" if it ended within this window OR has no end at
// all (still in flight). Tuned to the agent's 5-minute upload cadence
// — sessions older than that are not actively burning, even if their
// next snapshot hasn't arrived yet.
const LIVE_THRESHOLD_MS = 5 * 60 * 1000;

// Gap that splits two adjacent sessions into separate coding windows.
// 30min mirrors what most "coding heatmap" tools settle on — long
// enough to absorb a coffee, short enough that lunch ≠ overtime.
const ACTIVITY_GAP_MS = 30 * 60 * 1000;

export type LiveSession = UsageRecord & {
  totalTokens: number;
  // Wall-clock seconds the session has been open. Used for the
  // "burn rate" sort.
  durationMs: number;
  tokensPerMin: number;
};

export function selectLiveSessions(
  records: UsageRecord[],
  now: number = Date.now(),
  limit = 10
): LiveSession[] {
  const cutoff = now - LIVE_THRESHOLD_MS;
  const live: LiveSession[] = [];
  for (const r of records) {
    const lastTs = r.endedAt ?? r.startedAt;
    if (lastTs < cutoff) continue;
    const totalTokens =
      r.inputTokens +
      r.outputTokens +
      r.cacheReadTokens +
      r.cacheWriteTokens +
      r.reasoningTokens;
    const effectiveEnd = r.endedAt ?? now;
    const durationMs = Math.max(1, effectiveEnd - r.startedAt);
    const tokensPerMin = (totalTokens / durationMs) * 60_000;
    live.push({ ...r, totalTokens, durationMs, tokensPerMin });
  }
  // Highest burn-rate first — "what's eating the budget right now".
  live.sort((a, b) => b.tokensPerMin - a.tokensPerMin);
  return live.slice(0, limit);
}

export type ActivityWindow = { start: number; end: number };

// Cluster session intervals into coding-window blocks. Any gap >
// ACTIVITY_GAP_MS opens a new window. Returns windows sorted by start.
export function activityWindows(
  records: UsageRecord[]
): ActivityWindow[] {
  if (records.length === 0) return [];
  const intervals: ActivityWindow[] = records
    .map((r) => ({ start: r.startedAt, end: r.endedAt ?? r.startedAt }))
    .sort((a, b) => a.start - b.start);

  const out: ActivityWindow[] = [];
  for (const iv of intervals) {
    const last = out[out.length - 1];
    if (last && iv.start - last.end <= ACTIVITY_GAP_MS) {
      last.end = Math.max(last.end, iv.end);
    } else {
      out.push({ ...iv });
    }
  }
  return out;
}

// `clip` (optional) is the displayed period — sessions that started
// before the period boundary get clipped to it so their full duration
// doesn't bleed into "today" math (the old behavior gave us 105h/day
// totals on busy users; the share image's hpd became absurd).
export function totalActiveHours(
  records: UsageRecord[],
  clip?: { start: number | null; end: number }
): number {
  const wStart = clip?.start ?? -Infinity;
  const wEnd = clip?.end ?? Infinity;
  const windows = activityWindows(records);
  let ms = 0;
  for (const w of windows) {
    const s = Math.max(w.start, wStart);
    const e = Math.min(w.end, wEnd);
    if (e > s) ms += e - s;
  }
  return ms / 3_600_000;
}
