import "server-only";
import { getTokenusageD1 } from "./cloudflare-bindings";
import { resolveUsageCost } from "./pricing";
import { tierFor, type LeaderboardPeriod, type LeaderboardRow } from "./leaderboard";

// D1 mirror of `loadLeaderboard` and `setShowOnLeaderboard` from
// src/lib/leaderboard.ts. Same SQL shape so the UI sees identical
// LeaderboardRow rows under either runtime. tierFor + pickFlavor +
// rowFlavor stay in the Node module since they're pure functions.

function periodWindow(
  period: LeaderboardPeriod,
  now: Date
): { from: number; to: number } {
  const to = now.getTime();
  if (period === "all") return { from: 0, to };
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.getTime(), to };
  }
  const days = period === "7d" ? 7 : 30;
  return { from: to - days * 24 * 60 * 60 * 1000, to };
}

export async function loadLeaderboardD1(
  period: LeaderboardPeriod,
  now: Date = new Date()
): Promise<LeaderboardRow[]> {
  const { from, to } = periodWindow(period, now);
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `
      SELECT
        u.id                    AS userId,
        u.username              AS username,
        u.is_admin              AS isAdmin,
        u.show_on_leaderboard   AS showOnLeaderboard,
        u.created_at            AS userCreatedAt,
        s.id                    AS sessionId,
        s.provider              AS provider,
        s.model                 AS model,
        s.input_tokens          AS inputTokens,
        s.output_tokens         AS outputTokens,
        s.cache_read_tokens     AS cacheReadTokens,
        s.cache_write_tokens    AS cacheWriteTokens,
        s.reasoning_tokens      AS reasoningTokens,
        s.cost_usd              AS costUsd,
        s.cost_status           AS costStatus
      FROM users u
      LEFT JOIN sessions_data s
        ON s.user_id = u.id
       AND s.started_at >= ?
       AND s.started_at <= ?
      WHERE u.activated_at IS NOT NULL
      ORDER BY u.created_at ASC
      `
    )
    .bind(from, to)
    .all<{
      userId: number;
      username: string;
      isAdmin: number;
      showOnLeaderboard: number;
      userCreatedAt: number;
      sessionId: number | null;
      provider: string | null;
      model: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
      cacheReadTokens: number | null;
      cacheWriteTokens: number | null;
      reasoningTokens: number | null;
      costUsd: number | null;
      costStatus: string | null;
    }>();
  const rows = result.results ?? [];

  const byUser = new Map<
    number,
    Omit<LeaderboardRow, "rank" | "tierIdx"> & { userCreatedAt: number }
  >();
  for (const r of rows) {
    let row = byUser.get(r.userId);
    if (!row) {
      row = {
        userId: r.userId,
        username: r.username,
        isAdmin: r.isAdmin === 1,
        showOnLeaderboard: r.showOnLeaderboard === 1,
        totalCost: 0,
        totalTokens: 0,
        sessionCount: 0,
        userCreatedAt: r.userCreatedAt,
      };
      byUser.set(r.userId, row);
    }
    if (r.sessionId == null || r.provider == null) continue;

    const tokens = {
      input: r.inputTokens ?? 0,
      output: r.outputTokens ?? 0,
      cacheRead: r.cacheReadTokens ?? 0,
      cacheWrite: r.cacheWriteTokens ?? 0,
      reasoning: r.reasoningTokens ?? 0,
    };
    const resolvedCost = resolveUsageCost({
      provider: r.provider,
      model: r.model,
      costUsd: r.costUsd,
      costStatus: r.costStatus,
      tokens,
    });
    row.totalCost += resolvedCost.costUsd ?? 0;
    row.totalTokens += tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite;
    row.sessionCount += 1;
  }

  return Array.from(byUser.values())
    .sort((a, b) => b.totalCost - a.totalCost || a.userCreatedAt - b.userCreatedAt)
    .map((r, i) => {
      const t = tierFor(r.totalCost);
      return {
        rank: i + 1,
        userId: r.userId,
        username: r.username,
        isAdmin: r.isAdmin,
        showOnLeaderboard: r.showOnLeaderboard,
        totalCost: r.totalCost,
        totalTokens: r.totalTokens,
        sessionCount: r.sessionCount,
        tierIdx: t.idx,
      };
    });
}

export async function setShowOnLeaderboardD1(
  userId: number,
  show: boolean
): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET show_on_leaderboard = ? WHERE id = ?`)
    .bind(show ? 1 : 0, userId)
    .run();
}
