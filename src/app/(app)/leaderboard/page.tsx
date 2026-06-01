import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readCurrentUser } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import {
  loadLeaderboard,
  LEADERBOARD_TIERS,
  rowFlavor,
  displayNameFor,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";
import { formatUsd, formatTokens } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaderboardChallenge } from "@/components/leaderboard-challenge";
import { LeaderboardTierConfetti } from "@/components/leaderboard-tier-confetti";
import { LeaderboardRotateAfterMount } from "@/components/leaderboard-rotate-after-mount";
import { toggleLeaderboardVisibility } from "./actions";

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

function daysLeftInMonth(now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, last - now.getDate());
}

const CHALLENGE_LABELS = {
  challenge: "挑战",
  gap: "还差",
  perDay: "每天",
  daysLeft: "本月剩 {n} 天",
  monthEnd: "月底前",
  close: "关闭",
  accept: "我接受 PUA",
  tauntDoable: "这个差距还能抢救一下，干就完了",
  tauntSteep: "有点猛，但卷王的世界没有不可能",
  tauntCrushing: "建议你先问问老板能不能给加预算",
};

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

  // Per-refresh rotation: the cookie is bumped after this render by a
  // <LeaderboardRotateAfterMount/> client component, so the next visit
  // sees a different taunt/praise per row (guaranteed distinct for 5
  // consecutive refreshes — see pickFlavor in lib/leaderboard).
  const cookieStore = await cookies();
  const rotation =
    Number.parseInt(cookieStore.get("lb-rot")?.value ?? "0", 10) || 0;

  const rows = await loadLeaderboard(period);
  const myRow = rows.find((r) => r.userId === me.id);
  const myRank = myRow?.rank ?? null;
  const totalRows = rows.length;

  // Top 3 podium uses the existing rows; everyone gets re-rendered in
  // the long table below too so the "你 →" sticker can travel down.
  const podium = rows.slice(0, 3);
  const allZero = rows.every((r) => r.totalCost === 0);

  const aboveMe =
    myRow != null
      ? rows.filter((r) => r.rank < myRow.rank).slice(-3) // up to 3 directly above me
      : [];

  const daysLeft = daysLeftInMonth(new Date());

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <LeaderboardRotateAfterMount />
      {myRow && (
        <LeaderboardTierConfetti currentTierIdx={myRow.tierIdx} />
      )}

      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-fg-muted hover:text-fg-default"
      >
        ← 返回看板
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg-strong">
            排行榜
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            不烧 token 的都坐冷板凳 · 每个 token 都在替你写简历
          </p>
        </div>

        {/* Privacy toggle. Phrased as the action — clicking flips it. */}
        <form action={toggleLeaderboardVisibility}>
          <input
            type="hidden"
            name="show"
            value={myRow?.showOnLeaderboard ? "0" : "1"}
          />
          <button
            type="submit"
            className="rounded border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs text-fg-muted hover:border-accent hover:text-accent"
          >
            {myRow?.showOnLeaderboard
              ? "🙈 在榜上隐去我的昵称"
              : "👀 把我的昵称放回榜上"}
          </button>
        </form>
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

      {/* Empty state: nobody on the server burned a cent this period. */}
      {allZero && (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-12 text-center">
            <div className="text-4xl">🦥</div>
            <h2 className="text-lg font-semibold text-fg-strong">全员摸鱼</h2>
            <p className="mx-auto max-w-sm text-sm text-fg-muted">
              这个周期没人烧过 token。换个时段看看，或者你来当第一个不摸鱼的人。
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-flex rounded-md bg-fg-strong px-4 py-2 text-sm font-medium text-bg-app hover:opacity-90"
            >
              去看板继续工作
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Podium — top 3 oversized cards (only when there's actual usage) */}
      {!allZero && podium.length > 0 && podium[0].totalCost > 0 && (
        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          {podium.map((row) => {
            const tier = LEADERBOARD_TIERS[row.tierIdx];
            const isMe = row.userId === me.id;
            const display = displayNameFor(row, me.id);
            return (
              <div key={row.userId} className="relative">
                <Card
                  className={isMe ? "border-accent panel-hover" : "panel-hover"}
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
                      {display}{" "}
                      <span className="text-fg-faint">#{row.userId}</span>
                    </div>
                    <div className="mt-1 text-fg-faint">
                      {formatTokens(row.totalTokens)} tokens · {row.sessionCount} sessions
                    </div>
                  </CardContent>
                </Card>
                {isMe && (
                  // Sibling of Card (not child) so the card's overflow-hidden
                  // doesn't clip the half that sticks above the top edge.
                  <span className="absolute -top-2 right-2 z-10 whitespace-nowrap rounded bg-accent px-2 py-0.5 text-[10px] font-bold text-bg-app shadow-sm">
                    你 →
                  </span>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Full ranking */}
      {!allZero && (
        <Card>
          <CardHeader>
            <CardTitle>完整排名</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-border-subtle">
              {rows.map((row) => {
                const tier = LEADERBOARD_TIERS[row.tierIdx];
                const isMe = row.userId === me.id;
                const flavor = rowFlavor(row, totalRows, period, rotation);
                const flavorColor =
                  flavor.mood === "praise"
                    ? "text-success"
                    : flavor.mood === "taunt"
                      ? "text-warning"
                      : "text-fg-faint";
                const display = displayNameFor(row, me.id);
                const canChallenge =
                  myRow != null && row.rank < myRow.rank && row.totalCost > myRow.totalCost;
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
                      <div className="flex flex-wrap items-center gap-2 truncate text-sm">
                        <span className="font-medium text-fg-strong">
                          {display}
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
                        {canChallenge && (
                          <LeaderboardChallenge
                            meCost={myRow!.totalCost}
                            targetCost={row.totalCost}
                            targetName={display}
                            targetRank={row.rank}
                            daysLeft={daysLeft}
                            labels={CHALLENGE_LABELS}
                          />
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
      )}

      {/* "How to climb" — only show when user isn't #1 and has someone above. */}
      {!allZero && myRow && myRank && myRank > 1 && aboveMe.length > 0 && (
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
                      {displayNameFor(r, me.id)}
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
