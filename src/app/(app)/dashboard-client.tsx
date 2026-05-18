"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useAggregate } from "@/lib/use-aggregate";
import { findPricing } from "@/lib/pricing-client";
import { formatInt, formatTokens, formatUsd } from "@/lib/format";
import { interp } from "@/i18n/interp";
import type { CustomRange, Period, UsageRecord } from "@/lib/types";
import type { Rule } from "@/lib/pricing";
import type { Dictionary } from "@/i18n/types";
import { PeriodTabs } from "@/components/period-tabs";
import { ShareButton, SHARE_EVENT } from "@/components/share-button";
import { ForecastCard } from "@/components/forecast-card";
import { computeForecast } from "@/lib/forecast";
import { Share2 } from "lucide-react";
import { UsageTrend } from "@/components/usage-trend";
import { OnboardingCard } from "@/components/onboarding-card";
import { AgentStatusBar } from "@/components/agent-status-bar";
import { ModelPriceTooltip } from "@/components/model-price-tooltip";
import { CompareCard } from "@/components/compare-card";
import { computeRoi, periodDays, type PlanLite } from "@/lib/roi-client";
import { pickDailyTaunt, pickRoiLine } from "@/lib/encouragement";
import { selectLiveSessions, totalActiveHours, type LiveSession } from "@/lib/activity";
import { periodWindow } from "@/lib/aggregate";
import {
  computeAllLimitWindows,
  STOCK_WINDOWS,
  type LimitWindow,
} from "@/lib/limit-windows";
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

// ─── server → client wire format ──────────────────────────────────────────
//
// page.tsx hands over everything the dashboard needs in one prop bag. From
// here on the dashboard is fully client-driven: changing the period filter
// is a useState set, the aggregation is a useMemo, no server round-trip.
// URL stays in sync via history.pushState so a particular view is still
// link-shareable, but page navigation isn't required.

type SyncState = {
  lastUploadedAt: number | null;
  syncIntervalSeconds: number;
  paused: boolean;
} | null;

type BannerSource = {
  adapter: { label: string };
  recordCount: number;
  sourcePath: string;
};

export function DashboardClient({
  records,
  rules,
  sources,
  fellBackToSample,
  initialPeriod,
  initialCustomRange,
  username,
  userId,
  mountSeed,
  activePlans,
  locale,
  t,
  showOnboarding,
  syncState,
  agentSeenAt,
}: {
  records: UsageRecord[];
  rules: Rule[];
  sources: BannerSource[];
  fellBackToSample: boolean;
  initialPeriod: Period;
  initialCustomRange?: CustomRange;
  username: string | null;
  userId: number | null;
  mountSeed: number;
  activePlans: PlanLite[];
  locale: string;
  t: Dictionary;
  showOnboarding: boolean;
  syncState: SyncState;
  agentSeenAt: number | null;
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [customRange, setCustomRange] = useState<CustomRange | undefined>(
    initialCustomRange
  );
  const [, startTransition] = useTransition();

  // Reflect the current view in the URL so a link to the dashboard with a
  // specific period stays sharable. replaceState (not push) keeps the back
  // button useful — we don't want every period click adding to history.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    if (period !== "7d") sp.set("period", period);
    if (period === "custom" && customRange) {
      if (customRange.from) sp.set("from", customRange.from);
      if (customRange.to) sp.set("to", customRange.to);
    }
    const q = sp.toString();
    const next = q ? `${window.location.pathname}?${q}` : window.location.pathname;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [period, customRange]);

  // The actual data work. `useAggregate` picks the right execution mode:
  // sync useMemo for small datasets, Web Worker for >10k records. The
  // call surface stays identical from the component's POV.
  const { agg, scoped, granularity } = useAggregate(records, period, customRange);

  // Forecast feeds off ALL daily cost history (not just the selected
  // period) so it can compare this calendar month to last and project
  // to month-end. The aggregation here is a stripped-down per-day cost
  // bucket — no model breakdown, no token totals — to keep the work
  // cheap when records is large.
  const forecastByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) {
      const d = new Date(r.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      m.set(key, (m.get(key) ?? 0) + (r.costUsd ?? 0));
    }
    return [...m.entries()]
      .map(([date, costUsd]) => ({ date, totalTokens: 0, costUsd }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  const forecast = useMemo(
    () => computeForecast(forecastByDay),
    [forecastByDay]
  );

  const recent = useMemo(
    () =>
      [...scoped].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10),
    [scoped]
  );

  // Coding-hours KPI + the htop-style live panel. Both are pure derivations
  // off the scoped records, so they update for free when the period changes.
  // Clip sessions to the period window so a session that spans the
  // boundary doesn't bleed its full duration into the displayed total
  // (the unclipped version gave us 177h / 7d → 25h/day on busy users).
  const codingHours = useMemo(() => {
    const win = periodWindow(period, new Date(), customRange);
    return totalActiveHours(scoped, win);
  }, [scoped, period, customRange]);
  // Period length in days — used to normalize percentile comparisons
  // ("$/day" / "tokens/day") against the industry reference distribution.
  const days = useMemo(
    () => periodDays(period, customRange),
    [period, customRange]
  );
  // Live sessions only make sense for "today"/"24h" — looking at "live"
  // sessions inside a 30-day window is just "yesterday's stale rows".
  const isDailyPeriod = period === "today" || period === "24h";
  const liveSessions = useMemo(
    () => (isDailyPeriod ? selectLiveSessions(records) : []),
    [records, isDailyPeriod]
  );
  // Rolling-window burn — derived from records, independent of the
  // currently-selected period so the 5h/24h/7d/30d numbers stay
  // honest regardless of what tab the user is on.
  const limitWindows = useMemo(
    () => computeAllLimitWindows(records),
    [records]
  );

  const handlePeriod = (next: Period) => {
    startTransition(() => setPeriod(next));
  };
  const handleCustom = (range: CustomRange) => {
    startTransition(() => {
      setPeriod("custom");
      setCustomRange(range);
    });
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border-subtle bg-bg-app/85 px-6 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-medium tracking-tight text-fg-strong">
            {t.meta.title}
          </h1>
          <p className="truncate text-[12px] text-fg-muted">{t.header.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodTabs
            active={period}
            custom={customRange}
            onChange={handlePeriod}
            onCustomChange={handleCustom}
            t={t.period}
          />
        </div>
      </header>

      {/* ShareButton dialog stays mounted but the visible trigger is now
          per-KPI-card (a tiny icon in each SummaryCard's top-right
          corner). The card icons dispatch `tu-share-now`, which the
          ShareButton's internal listener uses to open the dialog. The
          component still renders its own button for accessibility, but
          we hide it with sr-only so it doesn't float awkwardly in the
          header. */}
      <div className="sr-only">
        <ShareButton
          username={username ?? ""}
          userId={userId ?? 0}
          period={period === "custom" ? "today" : period}
          agg={agg}
          codingHours={codingHours}
          activePlans={activePlans}
          labels={{ share: t.share.share, copied: t.share.copied }}
        />
      </div>

      <div className="flex-1 px-6 py-5">
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

        {showOnboarding && username && (
          <OnboardingCard
            username={username}
            t={t.onboarding}
            installT={t.install}
          />
        )}

        {/* Activity-window inference strip. Renders only when there's
            any usage in the visible window — a sub-line factoid that
            answers "how much *time* did this represent" alongside the
            money KPIs that follow. */}
        {codingHours > 0 && (
          <div
            className="tu-rise mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-subtle bg-bg-panel-2/40 px-4 py-2.5 text-xs"
            style={{ animationDelay: "20ms" }}
          >
            <span className="text-fg-muted">{t.activity.label}</span>
            <span className="font-mono tabular-nums text-fg-strong">
              {codingHours.toFixed(1)}{t.activity.hoursSuffix}
            </span>
            {agg.totals.totalTokens > 0 && (
              <>
                <span className="text-fg-faint">·</span>
                <span className="text-fg-muted">
                  {formatTokens(Math.round(agg.totals.totalTokens / Math.max(codingHours, 0.1)))}
                  /{t.activity.hoursSuffix}
                </span>
              </>
            )}
          </div>
        )}

        {/* Forecast card sits above the KPI row. It's the only number
            on the page that's *predictive* rather than retrospective —
            "按这节奏月底大约 $X" — so giving it dedicated airtime makes
            the decision (keep the subscription? switch to pay-as-you-
            go?) actionable instead of inferred. */}
        <section className="tu-rise mt-4" style={{ animationDelay: "20ms" }}>
          <ForecastCard
            forecast={forecast}
            activePlans={activePlans}
            labels={t.forecast}
          />
        </section>

        <section
          className="tu-rise mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "40ms" }}
        >
          <SummaryCard
            accent
            label={
              period === "all"
                ? t.cards.totalSpend
                : interp(t.cards.spendInPeriod, { period: t.period[period] })
            }
            value={
              agg.totals.costKnown
                ? formatUsd(agg.totals.costUsd, { precise: true })
                : `~${formatUsd(agg.totals.costUsd, { precise: true })}`
            }
            hint={agg.totals.costKnown ? t.cards.estimated : t.cards.partialCost}
          />
          <SummaryCard
            label={
              period === "all"
                ? t.cards.totalTokens
                : interp(t.cards.tokensInPeriod, { period: t.period[period] })
            }
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
          <CacheCard
            hitTokens={agg.totals.cacheReadTokens}
            missTokens={agg.totals.inputTokens}
            writtenTokens={agg.totals.cacheWriteTokens}
            t={t.cards}
          />
        </section>

        <section
          className="tu-rise mt-6 grid gap-3 lg:grid-cols-3"
          style={{ animationDelay: "120ms" }}
        >
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {granularity === "minute"
                  ? t.trend.titleMinute ?? t.trend.titleHour
                  : granularity === "hour"
                    ? t.trend.titleHour
                    : granularity === "month"
                      ? t.trend.titleMonth
                      : t.trend.titleDay}
              </CardTitle>
              <CardDescription>
                {interp(t.trend.description, {
                  period: t.period[period].toLowerCase(),
                })}
                {granularity === "hour" && (
                  <>
                    {" · "}
                    {interp(t.trend.tzHint, { tz: localTzLabel() })}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsageTrend
                data={agg.byDay}
                granularity={granularity}
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
                  <div key={`${m.provider}-${m.model}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <ModelPriceTooltip
                        model={m.model}
                        provider={m.provider}
                        pricing={findPricing(rules, m.model)}
                        usage={{
                          input: m.inputTokens,
                          output: m.outputTokens,
                          cacheRead: m.cacheReadTokens,
                          cacheWrite: m.cacheWriteTokens,
                          reasoning: m.reasoningTokens,
                        }}
                        t={t.priceTooltip}
                        className="truncate font-mono text-xs"
                      >
                        {m.model}
                      </ModelPriceTooltip>
                      <span className="tabular-nums text-muted-foreground">
                        {share}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/80 transition-[width] duration-500 ease-out"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
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

        {/* Subscription ROI / "arsenal" — sum of declared subscriptions
            on the left, prorated cost vs. actual API spend on the right,
            with a milestone-band encouragement line when the user is
            in profit. Empty state pulls them to /subscriptions. */}
        <section className="tu-rise mt-6" style={{ animationDelay: "160ms" }}>
          <SubscriptionRoiPanel
            plans={activePlans}
            apiSpendUsd={agg.totals.costUsd}
            period={period}
            customRange={customRange}
            locale={locale}
            userKey={userId ?? 0}
            mountSeed={mountSeed}
            t={t}
          />
        </section>

        {liveSessions.length > 0 && (
          <section
            className="tu-rise mt-6"
            style={{ animationDelay: "180ms" }}
          >
            <LiveSessionsPanel sessions={liveSessions} t={t.live} />
          </section>
        )}

        <section
          className="tu-rise mt-6"
          style={{ animationDelay: "190ms" }}
        >
          <LimitWindowsPanel
            windows={limitWindows}
            plans={activePlans}
            t={t.limits}
          />
        </section>

        <section
          className="tu-rise mt-6"
          style={{ animationDelay: "195ms" }}
        >
          <CompareCard
            spendUsdPerDay={agg.totals.costUsd / Math.max(1, days)}
            tokensPerDay={agg.totals.totalTokens / Math.max(1, days)}
            hoursPerDay={codingHours / Math.max(1, days)}
            period={period}
            t={t.compare}
          />
        </section>

        <section className="tu-rise mt-6" style={{ animationDelay: "200ms" }}>
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
                  {agg.byModel.map((m, i) => (
                    <TableRow
                      key={`${m.provider}-${m.model}`}
                      className={
                        i % 2 === 1 ? "bg-muted/30 transition-colors" : "transition-colors"
                      }
                    >
                      <TableCell>
                        <Badge variant="outline">{m.provider}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <ModelPriceTooltip
                          model={m.model}
                          provider={m.provider}
                          pricing={findPricing(rules, m.model)}
                          usage={{
                            input: m.inputTokens,
                            output: m.outputTokens,
                            cacheRead: m.cacheReadTokens,
                            cacheWrite: m.cacheWriteTokens,
                            reasoning: m.reasoningTokens,
                          }}
                          t={t.priceTooltip}
                        >
                          {m.model}
                        </ModelPriceTooltip>
                      </TableCell>
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

        <section className="tu-rise mt-6" style={{ animationDelay: "280ms" }}>
          <Card>
            <CardHeader>
              <CardTitle>{t.recent.title}</CardTitle>
              <CardDescription>{t.recent.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <RecentSessions
                records={recent}
                rules={rules}
                t={t.recent}
                tPrice={t.priceTooltip}
                locale={locale}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

// ---- small presentational helpers (carried over from page.tsx) ----

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={
        "group " +
        (accent
          ? "relative overflow-hidden panel-hover before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-foreground/70"
          : "relative overflow-hidden panel-hover")
      }
    >
      {/* Per-card share trigger — hover-revealed so it doesn't clutter
          a glance at the number. Click dispatches the shared event the
          single ShareButton in the page tree listens for. */}
      <button
        type="button"
        aria-label="share"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(SHARE_EVENT));
          }
        }}
        className="absolute right-2 top-2 z-10 rounded p-1 text-fg-faint opacity-0 transition-opacity hover:bg-bg-panel-2 hover:text-fg-default group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      <CardHeader className="pb-1">
        <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      )}
    </Card>
  );
}

function CacheCard({
  hitTokens,
  missTokens,
  writtenTokens,
  t,
}: {
  hitTokens: number;
  missTokens: number;
  writtenTokens: number;
  t: Dictionary["cards"];
}) {
  const denom = hitTokens + missTokens;
  const rate = denom === 0 ? 0 : (hitTokens / denom) * 100;
  const tone =
    rate >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : rate >= 50
        ? "text-foreground"
        : "text-amber-600 dark:text-amber-400";
  return (
    <Card className="panel-hover">
      <CardHeader className="pb-1">
        <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
          {t.cacheHitRate}
        </CardDescription>
        <CardTitle
          className={`text-3xl font-semibold tabular-nums tracking-tight ${tone}`}
        >
          {denom === 0 ? "—" : `${rate.toFixed(1)}%`}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 pt-0 text-xs">
        <CacheStat label={t.cacheHit} value={formatTokens(hitTokens)} />
        <CacheStat label={t.cacheMiss} value={formatTokens(missTokens)} />
        <CacheStat label={t.cacheWritten} value={formatTokens(writtenTokens)} />
      </CardContent>
    </Card>
  );
}

function CacheStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

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
        <span className="relative flex h-2 w-2" aria-hidden>
          <span
            className={
              fellBack
                ? "absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-amber-500 opacity-50"
                : "absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-500 opacity-50"
            }
          />
          <span
            className={
              fellBack
                ? "relative inline-flex h-2 w-2 rounded-full bg-amber-500"
                : "relative inline-flex h-2 w-2 rounded-full bg-emerald-500"
            }
          />
        </span>
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

function RecentSessions({
  records,
  rules,
  t,
  tPrice,
  locale,
}: {
  records: UsageRecord[];
  rules: Rule[];
  t: Dictionary["recent"];
  tPrice: Dictionary["priceTooltip"];
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
              className="group flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
            >
              <Badge variant="outline" className="shrink-0">
                {r.provider}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm">
                {r.title ?? t.untitled}
              </span>
              <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
                {r.model ? (
                  <ModelPriceTooltip
                    model={r.model}
                    provider={r.provider}
                    pricing={findPricing(rules, r.model)}
                    usage={{
                      input: r.inputTokens,
                      output: r.outputTokens,
                      cacheRead: r.cacheReadTokens,
                      cacheWrite: r.cacheWriteTokens,
                      reasoning: r.reasoningTokens,
                    }}
                    t={tPrice}
                  >
                    {r.model}
                  </ModelPriceTooltip>
                ) : (
                  "?"
                )}
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
              <ChevronRightIcon className="shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// htop-style live-session panel. Shows sessions that ended in the last
// 5 minutes (or are still open) sorted by burn rate — useful for
// catching "wait, what's still running and eating tokens?" in real
// time. Pure derivation off the records prop, no extra fetches.
function LiveSessionsPanel({
  sessions,
  t,
}: {
  sessions: LiveSession[];
  t: Dictionary["live"];
}) {
  return (
    <Card className="panel-hover">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <CardTitle>{t.title}</CardTitle>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.colSource}</TableHead>
              <TableHead>{t.colModel}</TableHead>
              <TableHead className="text-right">{t.colDuration}</TableHead>
              <TableHead className="text-right">{t.colTokens}</TableHead>
              <TableHead className="text-right">{t.colRate}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Badge variant="outline">{s.provider}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{s.model ?? "?"}</TableCell>
                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                  {formatDuration(s.durationMs)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTokens(s.totalTokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-accent">
                  {formatTokens(Math.round(s.tokensPerMin))}/min
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Rolling-window burn panel. Shows tokens / messages / cost in the
// stock 5h / 24h / 7d / 30d buckets so the user can eyeball "how
// close am I to Anthropic / OpenAI's invisible cap" without us
// pretending to know the exact cap (we don't — and it changes).
function LimitWindowsPanel({
  windows,
  plans,
  t,
}: {
  windows: Record<string, LimitWindow>;
  plans: PlanLite[];
  t: Dictionary["limits"];
}) {
  // Sum published caps across the user's active plans. Crude but
  // useful — a Claude Pro + Codex Plus user gets 45 + 150 = 195 / 5h
  // even though the buckets are actually provider-scoped, because
  // they'd never burn one bucket without first burning the other.
  const capPerWindow = (
    key: "per5h" | "per24h" | "per7d" | "per30d"
  ): number | null => {
    const sum = plans.reduce(
      (acc, p) => acc + (p.caps?.[key] ?? 0),
      0
    );
    return sum > 0 ? sum : null;
  };
  const capKey: Record<string, "per5h" | "per24h" | "per7d" | "per30d"> = {
    "5h": "per5h",
    "24h": "per24h",
    "7d": "per7d",
    "30d": "per30d",
  };

  return (
    <Card className="panel-hover">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STOCK_WINDOWS.map((spec) => {
          const w = windows[spec.id];
          if (!w) return null;
          const label = (t.windowLabels as Record<string, string>)[spec.labelKey];
          const cap = capPerWindow(capKey[spec.id]);
          const usedMsgs = Math.round(w.messages);
          const pct = cap ? Math.min(999, Math.round((usedMsgs / cap) * 100)) : null;
          // Color the bar by zone: green < 60, accent 60-85, warning
          // 85-100, danger above 100. Past 100 the bar caps visually
          // but the percentage label tells the truth.
          const barColor =
            pct == null
              ? "bg-fg-faint/40"
              : pct >= 100
                ? "bg-danger"
                : pct >= 85
                  ? "bg-warning"
                  : pct >= 60
                    ? "bg-accent"
                    : "bg-success";
          return (
            <div
              key={spec.id}
              className="rounded-md border border-border-subtle bg-bg-panel-2/40 p-3"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-fg-muted">
                {label}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg-strong">
                {formatTokens(Math.round(w.tokens))}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-fg-muted tabular-nums">
                <span>
                  {usedMsgs} {t.msgsSuffix}
                  {cap != null && (
                    <span className="text-fg-faint"> / {cap}</span>
                  )}
                </span>
                <span>{formatUsd(w.costUsd, { precise: true })}</span>
              </div>
              {cap != null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-panel-2">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
                    style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                  />
                </div>
              )}
              {cap != null && pct != null && (
                <div className="mt-1 text-right text-[10px] tabular-nums text-fg-muted">
                  {pct}%
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60 ? `${m % 60}m` : ""}`;
}

// Subscription "weapon arsenal" + ROI readout. We treat the user's
// declared subscriptions as a portfolio of fixed costs; the panel
// answers "for the period in view, would pay-per-token usage have
// cost more or less than what you're already paying?"
function SubscriptionRoiPanel({
  plans,
  apiSpendUsd,
  period,
  customRange,
  locale,
  userKey,
  mountSeed,
  t,
}: {
  plans: PlanLite[];
  apiSpendUsd: number;
  period: Period;
  customRange?: CustomRange;
  locale: string;
  userKey: number;
  mountSeed: number;
  t: Dictionary;
}) {
  if (plans.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{t.subs.title}</CardTitle>
          <CardDescription>{t.subs.emptyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/subscriptions"
            className="inline-flex rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            {t.subs.add}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const days = periodDays(period, customRange);
  const roi = computeRoi(apiSpendUsd, plans, days);
  // Today / 24h get the absolute-spend taunt corpus ($1 step).
  // Longer windows use the ROI corpus (variable 5-100% bands). The
  // `period` key in the picker means each tab gets a different pick
  // even when the math lands in the same band.
  const isDaily = period === "today" || period === "24h";
  // Compose the seed: stable user id + per-refresh mount seed = a fresh
  // pick on every reload, deterministic within a render pass.
  const seededKey = `${userKey}:${mountSeed}`;
  const message = isDaily
    ? pickDailyTaunt(apiSpendUsd, plans, locale, seededKey, period)
    : pickRoiLine(roi.ratioPct, roi.netUsd, plans, locale, seededKey, period);
  const inProfit = roi.netUsd >= 0;
  const periodLabel = t.period[period].toLowerCase();

  return (
    <Card className="panel-hover">
      <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{t.subs.title}</CardTitle>
          <CardDescription>
            {plans.length} {t.subs.activeSuffix} · {formatUsd(plans.reduce((s, p) => s + p.monthlyUsd, 0), { precise: true })}/mo
          </CardDescription>
        </div>
        <Link
          href="/subscriptions"
          className="shrink-0 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          {t.subs.manage}
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Plan grid — vendor color stripe + name + monthly. The card
            faces look like equipment cards in a "loadout" screen. */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>

        {/* ROI ladder — pro-rated cost vs API spend, big number for
            "recovered" on the right, progress bar across the bottom. */}
        <div className="grid grid-cols-1 gap-4 rounded-md border border-border-subtle bg-bg-panel-2/40 p-4 sm:grid-cols-3">
          <Stat label={interp(t.subs.proratedFor, { period: periodLabel })} value={formatUsd(roi.proratedUsd, { precise: true })} tone="muted" />
          <Stat label={interp(t.subs.spendFor, { period: periodLabel })} value={formatUsd(roi.apiSpendUsd, { precise: true })} tone="muted" />
          <Stat
            label={inProfit ? t.subs.recovered : t.subs.shortBy}
            value={`${inProfit ? "+" : ""}${formatUsd(Math.abs(roi.netUsd), { precise: true })}`}
            tone={inProfit ? "success" : "warning"}
            big
          />
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between text-xs text-fg-muted mb-1.5">
              <span>{t.subs.progress}</span>
              <span className="font-mono tabular-nums text-fg-default">
                {roi.ratioPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-panel-2">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  inProfit ? "bg-success" : "bg-accent"
                }`}
                style={{ width: `${Math.min(roi.ratioPct, 100)}%` }}
              />
            </div>
            {message && (
              <p
                className={
                  "mt-3 text-center text-sm italic " +
                  (message.tone === "roast"
                    ? "text-danger"
                    : message.tone === "tease"
                      ? "text-warning"
                      : message.tone === "shade"
                        ? "text-fg-muted"
                        : "text-success")
                }
              >
                {message.text}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ plan }: { plan: PlanLite }) {
  // Subtle vendor accent stripe — turns the plan list into a "loadout"
  // grid rather than a row of identical chips.
  const vendorColor: Record<string, string> = {
    Anthropic: "from-orange-500/30 to-orange-500/5",
    OpenAI: "from-emerald-500/30 to-emerald-500/5",
    Cursor: "from-indigo-500/30 to-indigo-500/5",
    GitHub: "from-fuchsia-500/30 to-fuchsia-500/5",
    DeepSeek: "from-blue-500/30 to-blue-500/5",
  };
  const tint = vendorColor[plan.vendor] ?? "from-accent/30 to-accent/5";
  return (
    <div className="group/p relative overflow-hidden rounded-md border border-border-subtle bg-bg-panel p-3 transition-[border-color] hover:border-accent/40">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tint}`}
      />
      <div className="text-[10px] font-medium uppercase tracking-wider text-fg-faint">
        {plan.vendor}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-fg-strong">
        {plan.name}
      </div>
      <div className="mt-1 font-mono text-xs text-fg-muted">
        {formatUsd(plan.monthlyUsd, { precise: false })}/mo
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone: "muted" | "success" | "warning";
  big?: boolean;
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-fg-default";
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 tabular-nums tracking-tight ${toneCls} ${
          big ? "text-2xl font-semibold" : "text-base font-medium"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// `UTC+8` / `UTC-5` / `UTC+5:30` formatted from the browser's clock —
// surfaces what timezone the hour-bucketed trend chart is binning by.
function localTzLabel(): string {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const h = Math.trunc(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
