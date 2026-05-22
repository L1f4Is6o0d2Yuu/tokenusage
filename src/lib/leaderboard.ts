import "server-only";
import { openServerDb } from "./server-db";
import { resolveUsageCost } from "./pricing";

// Period buckets the leaderboard supports. Keeping the same vocabulary
// as the dashboard (today / 7d / 30d / all) so users don't have to
// learn two systems.
export type LeaderboardPeriod = "today" | "7d" | "30d" | "all";

export type LeaderboardRow = {
  rank: number;
  userId: number;
  username: string;
  isAdmin: boolean;
  // Honors users.show_on_leaderboard. When false, the page should
  // render this row as `Anon #<id>` for everyone except the viewer
  // who matches `userId`. The raw username stays in the field so the
  // viewer can still recognize themselves.
  showOnLeaderboard: boolean;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  // Frozen tier index so the page can render a consistent badge
  // without re-running the lookup per row in the React component.
  tierIdx: number;
};

// Tier ladder. Index → { label, emoji, min spend ($) in the period }.
// PUA-flavored names that match the taglines/encouragement corpus
// tone — every tier is a tiny mood-board.
export const LEADERBOARD_TIERS = [
  { idx: 0, label: "划水冠军", emoji: "🥱", min: 0 },
  { idx: 1, label: "新手村村民", emoji: "🐣", min: 0.01 },
  { idx: 2, label: "见习巫师", emoji: "🪄", min: 2 },
  { idx: 3, label: "中级炼金师", emoji: "⚗️", min: 10 },
  { idx: 4, label: "资深点金者", emoji: "🪙", min: 30 },
  { idx: 5, label: "AI 高手", emoji: "🔥", min: 100 },
  { idx: 6, label: "AI 大魔王", emoji: "👑", min: 300 },
  { idx: 7, label: "令人发指", emoji: "🚨", min: 1000 },
] as const;

export function tierFor(cost: number): (typeof LEADERBOARD_TIERS)[number] {
  // Walk from the top — first threshold the cost clears wins.
  for (let i = LEADERBOARD_TIERS.length - 1; i >= 0; i--) {
    if (cost >= LEADERBOARD_TIERS[i].min) return LEADERBOARD_TIERS[i];
  }
  return LEADERBOARD_TIERS[0];
}

// Returns a [startMs, endMs] window in epoch ms for the given period,
// anchored to the server's local clock (good enough — the dashboard's
// daily buckets use the same anchor).
function periodWindow(period: LeaderboardPeriod, now: Date): { from: number; to: number } {
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

export function loadLeaderboard(
  period: LeaderboardPeriod,
  now: Date = new Date()
): LeaderboardRow[] {
  const { from, to } = periodWindow(period, now);
  const db = openServerDb();
  try {
    // LEFT JOIN so a user with zero sessions in the window still shows
    // up (parked at the bottom on $0). That makes the "划水冠军" tier
    // populated and the page useful as a who's-active-this-week check.
    const rows = db
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
      .all(from, to) as Array<{
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
      }>;

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
  } finally {
    db.close();
  }
}

// Quick taunt picker. Deterministic on (userId, periodKey) so a given
// user sees the same line all session — refresh doesn't flicker — but
// a different week gives them new material. The corpus deliberately
// overlaps with the header tagline pool so the voice is consistent.
const TAUNTS = [
  // — 工位 / 同事对比 —
  "再不烧点 token 就被同事甩开了",
  "你这名次，对得起你的工位吗",
  "全公司就你 AI 用得最少",
  "同事卷成狗，你卷成冷板凳",
  "同事在卷模型，你在卷下班点",
  "你这班是怎么上的，token 这么少",
  "一天烧的不够同事一顿外卖钱",
  // — 老板 / HR 戏码 —
  "不烧 token 是不是不想升职",
  "你这 token 量配不上你的工资",
  "HR 都不忍心问你的绩效",
  "你说你忙？token 不会撒谎",
  "你这 token 数，建议换个行业",
  "你这数据传上来都觉得跌份儿",
  // — prompt / 水平嘲讽 —
  "你这 prompt 一看就没读过书",
  "你的 prompt 比相亲简历还敷衍",
  "AI 都救不动你这水平",
  "AI 都用不明白，怎么混的",
  "你这 token 烧得，跟你写的代码一样平庸",
  "你不是在用 AI，是在让 AI 看你瞎写",
  // — 厂商反向感谢 —
  "上桌就摸鱼，AI 厂商反手给你颁奖",
  "你这点 token 量，OpenAI 懒得给你画像",
  "给 OpenAI 送钱都送不到大门口",
  "Anthropic 财报里没你这一行",
  // — 通用酸言酸语 —
  "你这格局，AI 都带不动",
  "都什么时代了还不烧 token",
  "节俭过头叫抠门，到这份儿叫摆烂",
  "你这强度，AI 比你还闲",
  "建议你卸载这个 dashboard，省得我难受",
];

const PRAISES = [
  // — 卷王 / 重度用户认证 —
  "卷王在此",
  "AI 重度依赖症典型样本，请勿打扰",
  "你这进度让同事压力山大",
  "硅基生命之友",
  "AI 厂商最喜欢的那种用户",
  "稳定输出，资本家最爱",
  "这才叫真把 AI 当生产力，不是当玩具",
  // — 钱货比颠覆 —
  "你的 token 用量在替全组发电",
  "再烧下去要被纳入年度财报了",
  "单月薅出一台 MacBook，神之化身",
  "已锁定本月加薪名额",
  "薅毛量已申报 OpenAI 优秀客户奖",
  "已被 OpenAI 列入「亏麻了」名单",
  // — 同事 / 厂商破防 —
  "AI 厂商财务半夜起来加班",
  "套餐部 OKR 因你集体破防",
  "同事打开你的 dashboard，回去重新写简历",
  "卷出新高度，AI 厂商销售跪求你下调",
  // — 调侃式吹捧 —
  "别人 996，你 996 给 AI 当老板",
  "建议公司单独给你配台 H100",
  "OpenAI 看你日均 token 陷入沉思",
];

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Flip a user's "show me on the leaderboard" preference. Called from a
// server action triggered by the toggle on /leaderboard. We don't gate
// on isAdmin — it's the user's own row to manage.
export function setShowOnLeaderboard(userId: number, show: boolean): void {
  const db = openServerDb();
  try {
    db.prepare(
      `UPDATE users SET show_on_leaderboard = ? WHERE id = ?`
    ).run(show ? 1 : 0, userId);
  } finally {
    db.close();
  }
}

// Returns the display name for a row given the viewer. Honors the
// row's privacy preference: hidden rows show as `Anon #<id>` to
// everyone except the viewer themselves.
export function displayNameFor(
  row: LeaderboardRow,
  viewerId: number | null
): string {
  if (row.showOnLeaderboard || row.userId === viewerId) return row.username;
  return `Anon #${row.userId}`;
}

export function rowFlavor(
  row: LeaderboardRow,
  totalRows: number,
  period: LeaderboardPeriod
): { text: string; mood: "praise" | "neutral" | "taunt" } {
  const isTop = row.rank <= Math.max(3, Math.floor(totalRows * 0.1));
  const isBottom =
    row.rank > totalRows - 3 || (row.totalCost < 1 && row.rank > 3);
  const seed = `${row.userId}|${period}`;
  if (isTop) {
    return { text: PRAISES[hash(seed) % PRAISES.length], mood: "praise" };
  }
  if (isBottom) {
    return { text: TAUNTS[hash(seed) % TAUNTS.length], mood: "taunt" };
  }
  return { text: "", mood: "neutral" };
}
