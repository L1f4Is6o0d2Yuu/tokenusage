import Link from "next/link";
import { redirect } from "next/navigation";
import { readCurrentUser } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import {
  loadLeaderboard,
  LEADERBOARD_TIERS,
  rowFlavor,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";
import { formatUsd, formatTokens } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "today", label: "今天" },
  { key: "7d", label: "近 7 天" },
  { key: "30d", label: "近 30 天" },
  { key: "all", label: "全部" },
];

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  if (!isMultiUserMode()) redirect("/dashboard");
  const me = await readCurrentUser();
  if (!me) redirect("/login");

  const { period: rawPeriod } = await searchParams;
  const period: LeaderboardPeriod =
    rawPeriod === "today" || rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "all"
      ? rawPeriod
      : "30d";

  const rows = loadLeaderboard(period);
  const myRow = rows.find((r) => r.userId === me.id);
  const myRank = myRow?.rank ?? null;
  const totalRows = rows.length;

  // For "再烧 $X 就能超过 #N" hints on the user's row.
  const aboveMe =
    myRow != null
      ? rows.filter((r) => r.rank < myRow.rank).slice(-3) // up to 3 directly above me
      : [];

  // Top 3 podium uses the existing rows; everyone gets re-rendered in
  // the long table below too so the "你 →" sticker can travel down.
  const podium = rows.slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-fg-muted hover:text-fg-default"
      >
        ← 返回看板
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-fg-strong">
          排行榜
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          不烧 token 的都坐冷板凳 · 每个 token 都在替你写简历
        </p>
      </header>

      {/* Period switcher */}
      <div className="mb-8 inline-flex gap-1 rounded-md border border-border-subtle bg-bg-panel p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/leaderboard?period=${p.key}`}
            className={
              p.key === period
                ? "rounded px-3 py-1.5 text-xs font-medium bg-accent text-bg-app"
                : "rounded px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg-default"
            }
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Podium — top 3 oversized cards */}
      {podium.length > 0 && podium[0].totalCost > 0 && (
        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          {podium.map((row) => {
            const tier = LEADERBOARD_TIERS[row.tierIdx];
            const isMe = row.userId === me.id;
            return (
              <Card
                key={row.userId}
                className={
                  isMe
                    ? "relative border-accent panel-hover"
                    : "panel-hover"
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl">{rankMedal(row.rank)}</span>
                    <span className="text-[11px] text-fg-muted">
                      {tier.emoji} {tier.label}
                    </span>
                  </div>
                  <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
                    {formatUsd(row.totalCost, { precise: true })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-fg-muted">
                  <div className="truncate font-mono">
                    {row.username}{" "}
                    <span className="text-fg-faint">#{row.userId}</span>
                  </div>
                  <div className="mt-1 text-fg-faint">
                    {formatTokens(row.totalTokens)} tokens · {row.sessionCount} sessions
                  </div>
                  {isMe && (
                    <span className="absolute -right-1 -top-2 rounded bg-accent px-2 py-0.5 text-[10px] font-bold text-bg-app">
                      你 →
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Full ranking */}
      <Card>
        <CardHeader>
          <CardTitle>完整排名</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <ul className="divide-y divide-border-subtle">
            {rows.map((row) => {
              const tier = LEADERBOARD_TIERS[row.tierIdx];
              const isMe = row.userId === me.id;
              const flavor = rowFlavor(row, totalRows, period);
              const flavorColor =
                flavor.mood === "praise"
                  ? "text-success"
                  : flavor.mood === "taunt"
                    ? "text-warning"
                    : "text-fg-faint";
              const diffToBeat =
                isMe && aboveMe.length > 0
                  ? aboveMe[aboveMe.length - 1].totalCost - row.totalCost
                  : 0;
              return (
                <li
                  key={row.userId}
                  className={
                    isMe
                      ? "flex items-center gap-3 bg-accent/5 px-4 py-3"
                      : "flex items-center gap-3 px-4 py-3 hover:bg-bg-panel-2/30"
                  }
                >
                  <div className="w-10 shrink-0 text-center text-sm font-mono text-fg-muted">
                    {rankMedal(row.rank)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate text-sm">
                      <span className="font-medium text-fg-strong">
                        {row.username}
                      </span>
                      <span className="font-mono text-xs text-fg-faint">
                        #{row.userId}
                      </span>
                      {row.isAdmin && (
                        <Badge variant="outline" className="text-[10px]">admin</Badge>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-bold text-accent">← 你在这</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">
                      <span>{tier.emoji}</span>{" "}
                      <span>{tier.label}</span>
                      {flavor.text && (
                        <>
                          <span className="mx-2 text-fg-faint">·</span>
                          <span className={flavorColor}>{flavor.text}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-semibold tabular-nums tracking-tight">
                      {formatUsd(row.totalCost, { precise: true })}
                    </div>
                    <div className="text-[11px] text-fg-faint tabular-nums">
                      {formatTokens(row.totalTokens)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* "How to climb" — only show when user isn't #1 and has someone above. */}
      {myRow && myRank && myRank > 1 && aboveMe.length > 0 && (
        <Card className="mt-6 border-accent/30 bg-accent/5">
          <CardContent className="px-4 py-3 text-sm">
            <div className="mb-2 font-medium text-fg-strong">
              想往上爬？拿计算器
            </div>
            <ul className="space-y-1 text-xs text-fg-muted">
              {aboveMe.slice().reverse().map((r) => {
                const diff = r.totalCost - myRow.totalCost;
                return (
                  <li key={r.userId} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-fg-faint font-mono">
                      #{r.rank}
                    </span>
                    <span className="flex-1 truncate font-mono text-fg-default">
                      {r.username}
                    </span>
                    <span className="text-fg-strong tabular-nums">
                      再烧 {formatUsd(diff, { precise: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-fg-faint">
              不是让你乱烧，是让你别藏拙
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tier legend */}
      <details className="mt-6 text-xs text-fg-muted">
        <summary className="cursor-pointer hover:text-fg-default">
          段位说明（按周期内总花费）
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {LEADERBOARD_TIERS.map((t) => (
            <div
              key={t.idx}
              className="flex items-center gap-2 rounded border border-border-subtle bg-bg-panel-2/40 px-2 py-1.5"
            >
              <span>{t.emoji}</span>
              <span className="font-medium text-fg-default">{t.label}</span>
              <span className="ml-auto font-mono text-fg-faint tabular-nums">
                ≥ {formatUsd(t.min, { precise: true })}
              </span>
            </div>
          ))}
        </div>
      </details>
    </main>
  );
}
