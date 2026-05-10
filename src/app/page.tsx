import Link from "next/link";
import { cookies } from "next/headers";
import { loadRecords } from "@/lib/adapters";
import { aggregate, filterByPeriod, pickGranularity } from "@/lib/aggregate";
import { type CustomRange, type Period, type UsageRecord } from "@/lib/types";
import { formatInt, formatTokens, formatUsd } from "@/lib/format";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";
import { requireUser } from "@/lib/auth-guard";
import { logoutAction } from "@/app/auth-actions";
import { countServerRecords } from "@/lib/adapters";
import { getUserSyncState, getLatestAgentSeenAt } from "@/lib/sync-state";
import { PeriodTabs } from "@/components/period-tabs";
import { UsageTrend } from "@/components/usage-trend";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OnboardingCard } from "@/components/onboarding-card";
import { AgentStatusBar } from "@/components/agent-status-bar";
import { getDictionary, readLocale } from "@/i18n";
import { interp } from "@/i18n/interp";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/i18n/types";

const VALID_PERIODS: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all", "custom"];

function parsePeriod(raw: string | string[] | undefined): Period {
  if (typeof raw === "string" && (VALID_PERIODS as string[]).includes(raw)) {
    return raw as Period;
  }
  return "7d";
}

function parseCustomRange(
  from: string | string[] | undefined,
  to: string | string[] | undefined
): CustomRange | undefined {
  const f = typeof from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
  const t = typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null;
  if (!f && !t) return undefined;
  return { from: f ?? "", to: t ?? "" };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period: rawPeriod, from, to } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const customRange = period === "custom" ? parseCustomRange(from, to) : undefined;

  const currentUser = await requireUser();
  const locale = await readLocale();
  const t = await getDictionary(locale);
  const cookieStore = await cookies();
  const themeRaw = cookieStore.get(THEME_COOKIE)?.value;
  const theme: Theme = isTheme(themeRaw) ? themeRaw : "system";

  const { records, sources, fellBackToSample, mode } = await loadRecords();
  const scoped = filterByPeriod(records, period, customRange);
  const granularity = pickGranularity(scoped, period);
  const agg = aggregate(scoped, granularity);
  const recent = [...scoped].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);

  // First-run UX: in multi-user mode with absolutely zero records ever
  // ingested for this user, show a guided onboarding card instead of a row
  // of empty cards. We use the lifetime count rather than the period-scoped
  // count so the user doesn't think "no data this week" is the empty state.
  const showOnboarding =
    mode === "multi" && currentUser != null && countServerRecords(currentUser.id) === 0;

  // Live sync status pill — only meaningful in multi-user mode.
  const syncState =
    mode === "multi" && currentUser != null ? getUserSyncState(currentUser.id) : null;
  const agentSeenAt =
    mode === "multi" && currentUser != null
      ? getLatestAgentSeenAt(currentUser.id)
      : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.header.tagline}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {currentUser && (
              <div className="flex items-center gap-2 text-xs">
                <Link
                  href="/tokens"
                  className="font-mono text-foreground hover:underline"
                >
                  {currentUser.username}
                </Link>
                {currentUser.isAdmin && (
                  <Link
                    href="/users"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t.navHeader.users}
                  </Link>
                )}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t.navHeader.signOut}
                  </button>
                </form>
              </div>
            )}
            <ThemeSwitcher active={theme} labels={t.theme} />
            <LocaleSwitcher active={locale} label={t.language.label} />
          </div>
          <PeriodTabs active={period} custom={customRange} t={t.period} />
        </div>
      </header>

      <SourceBanner
        sources={sources}
        fellBack={fellBackToSample}
        t={t.banner}
      />

      {syncState && (
        <AgentStatusBar
          lastSyncedAt={syncState.lastUploadedAt}
          agentSeenAt={agentSeenAt}
          intervalSeconds={syncState.syncIntervalSeconds}
          paused={syncState.paused}
          t={t.agent}
        />
      )}

      {showOnboarding && currentUser && (
        <OnboardingCard
          username={currentUser.username}
          t={t.onboarding}
          installT={t.install}
        />
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t.cards.totalSpend}
          value={
            agg.totals.costKnown
              ? formatUsd(agg.totals.costUsd, { precise: true })
              : `~${formatUsd(agg.totals.costUsd, { precise: true })}`
          }
          hint={agg.totals.costKnown ? t.cards.estimated : t.cards.partialCost}
        />
        <SummaryCard
          label={t.cards.totalTokens}
          value={formatTokens(agg.totals.totalTokens)}
          hint={interp(t.cards.sessions, { n: formatInt(agg.totals.records) })}
        />
        <SummaryCard
          label={t.cards.inputOutput}
          value={`${formatTokens(agg.totals.inputTokens)} / ${formatTokens(
            agg.totals.outputTokens
          )}`}
          hint={t.cards.nonCache}
        />
        <SummaryCard
          label={t.cards.cacheRead}
          value={formatTokens(agg.totals.cacheReadTokens)}
          hint={interp(t.cards.written, { f: formatTokens(agg.totals.cacheWriteTokens) })}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {granularity === "month" ? t.trend.titleMonth : t.trend.titleDay}
            </CardTitle>
            <CardDescription>
              {interp(t.trend.description, {
                period: t.period[period].toLowerCase(),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageTrend
              data={agg.byDay}
              labels={{
                tokens: t.trend.yTokens,
                cost: t.trend.yCost,
                empty: t.trend.empty,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.topModels.title}</CardTitle>
            <CardDescription>{t.topModels.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agg.byModel.slice(0, 5).map((m) => {
              const share =
                agg.totals.totalTokens === 0
                  ? 0
                  : Math.round((m.totalTokens / agg.totals.totalTokens) * 100);
              return (
                <div key={`${m.provider}-${m.model}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.model}</span>
                    <span className="text-muted-foreground">{share}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTokens(m.totalTokens)}</span>
                    <span>
                      {m.costKnown
                        ? formatUsd(m.costUsd, { precise: true })
                        : `~${formatUsd(m.costUsd, { precise: true })}`}
                    </span>
                  </div>
                </div>
              );
            })}
            {agg.byModel.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.topModels.empty}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.breakdown.title}</CardTitle>
              <CardDescription>{t.breakdown.description}</CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/prices"
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                {t.breakdown.editPrices}
              </Link>
              <a
                href={
                  period === "custom" && customRange
                    ? `/api/export?period=custom&from=${customRange.from}&to=${customRange.to}`
                    : `/api/export?period=${period}`
                }
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                download
              >
                {t.breakdown.exportCsv}
              </a>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.breakdown.columns.provider}</TableHead>
                  <TableHead>{t.breakdown.columns.model}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.sessions}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.input}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.output}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.cacheRW}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.reasoning}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.total}</TableHead>
                  <TableHead className="text-right">{t.breakdown.columns.cost}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agg.byModel.map((m) => (
                  <TableRow key={`${m.provider}-${m.model}`}>
                    <TableCell>
                      <Badge variant="outline">{m.provider}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.model}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(m.records)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTokens(m.inputTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTokens(m.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatTokens(m.cacheReadTokens)} /{" "}
                      {formatTokens(m.cacheWriteTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTokens(m.reasoningTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatTokens(m.totalTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.costKnown
                        ? formatUsd(m.costUsd, { precise: true })
                        : `~${formatUsd(m.costUsd, { precise: true })}`}
                    </TableCell>
                  </TableRow>
                ))}
                {agg.byModel.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-sm text-muted-foreground"
                    >
                      {t.breakdown.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.recent.title}</CardTitle>
            <CardDescription>{t.recent.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RecentSessions records={recent} t={t.recent} locale={locale} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function RecentSessions({
  records,
  t,
  locale,
}: {
  records: UsageRecord[];
  t: Dictionary["recent"];
  locale: string;
}) {
  if (records.length === 0) {
    return <p className="px-6 py-4 text-sm text-muted-foreground">{t.empty}</p>;
  }
  return (
    <ul className="divide-y">
      {records.map((r) => {
        const total =
          r.inputTokens +
          r.outputTokens +
          r.cacheReadTokens +
          r.cacheWriteTokens +
          r.reasoningTokens;
        const href = `/sessions/${encodeURIComponent(r.id)}`;
        const when = new Date(r.startedAt).toLocaleString(locale, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <li key={r.id}>
            <Link
              href={href}
              className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/40"
            >
              <Badge variant="outline" className="shrink-0">
                {r.provider}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm">
                {r.title ?? t.untitled}
              </span>
              <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
                {r.model ?? "?"}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {when}
              </span>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                {formatTokens(total)}
              </span>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                {r.costUsd == null ? "—" : formatUsd(r.costUsd, { precise: true })}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      )}
    </Card>
  );
}

type BannerSource = { adapter: { label: string }; recordCount: number; sourcePath: string };

function SourceBanner({
  sources,
  fellBack,
  t,
}: {
  sources: BannerSource[];
  fellBack: boolean;
  t: Dictionary["banner"];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span
          className={
            fellBack
              ? "h-2 w-2 rounded-full bg-amber-500"
              : "h-2 w-2 rounded-full bg-emerald-500"
          }
        />
        {sources.length === 0 ? (
          <span>{t.noData}</span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t.readingFrom}</span>
            {sources.map((s, i) => (
              <span key={s.adapter.label} className="flex items-center gap-1">
                <span className="font-mono text-foreground">{s.adapter.label}</span>
                <span className="text-muted-foreground">
                  ({formatInt(s.recordCount)})
                </span>
                {i < sources.length - 1 && <span className="text-muted-foreground">+</span>}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {fellBack && (
          <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
            {t.sampleBadge}
          </Badge>
        )}
      </div>
    </div>
  );
}
