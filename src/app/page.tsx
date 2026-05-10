import Link from "next/link";
import { loadRecords } from "@/lib/adapters";
import { aggregate, filterByPeriod } from "@/lib/aggregate";
import { PERIOD_LABELS, type Period, type UsageRecord } from "@/lib/types";
import { formatInt, formatTokens, formatUsd } from "@/lib/format";
import { PeriodTabs } from "@/components/period-tabs";
import { UsageTrend } from "@/components/usage-trend";
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

const VALID_PERIODS: Period[] = ["today", "24h", "7d", "30d", "all"];

function parsePeriod(raw: string | string[] | undefined): Period {
  if (typeof raw === "string" && (VALID_PERIODS as string[]).includes(raw)) {
    return raw as Period;
  }
  return "7d";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);

  const { records, sources, fellBackToSample } = await loadRecords();
  const scoped = filterByPeriod(records, period);
  const agg = aggregate(scoped);
  const recent = [...scoped].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">tokenusage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Token spend across your AI tooling — read-only, local-first.
          </p>
        </div>
        <PeriodTabs active={period} />
      </header>

      <SourceBanner sources={sources} fellBack={fellBackToSample} />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total spend"
          value={
            agg.totals.costKnown
              ? formatUsd(agg.totals.costUsd, { precise: true })
              : `~${formatUsd(agg.totals.costUsd, { precise: true })}`
          }
          hint={agg.totals.costKnown ? "estimated" : "partial cost data"}
        />
        <SummaryCard
          label="Total tokens"
          value={formatTokens(agg.totals.totalTokens)}
          hint={`${formatInt(agg.totals.records)} sessions`}
        />
        <SummaryCard
          label="Input / Output"
          value={`${formatTokens(agg.totals.inputTokens)} / ${formatTokens(
            agg.totals.outputTokens
          )}`}
          hint="non-cache"
        />
        <SummaryCard
          label="Cache read"
          value={formatTokens(agg.totals.cacheReadTokens)}
          hint={`${formatTokens(agg.totals.cacheWriteTokens)} written`}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily trend</CardTitle>
            <CardDescription>
              Tokens (left) and USD cost (right) per local day —{" "}
              {PERIOD_LABELS[period].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageTrend data={agg.byDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top models</CardTitle>
            <CardDescription>By total tokens</CardDescription>
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
                    <span>{formatTokens(m.totalTokens)} tokens</span>
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
              <p className="text-sm text-muted-foreground">No usage in this period.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Breakdown by model</CardTitle>
              <CardDescription>
                Sorted by total tokens. Costs are estimates based on what your
                gateway recorded, not bills.
              </CardDescription>
            </div>
            <a
              href={`/api/export?period=${period}`}
              className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              download
            >
              Export CSV
            </a>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Cache R/W</TableHead>
                  <TableHead className="text-right">Reasoning</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
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
                      No usage in this period.
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
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Latest 10 in this period — click to inspect.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RecentSessions records={recent} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function RecentSessions({ records }: { records: UsageRecord[] }) {
  if (records.length === 0) {
    return (
      <p className="px-6 py-4 text-sm text-muted-foreground">
        No sessions in this period.
      </p>
    );
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
        const when = new Date(r.startedAt).toLocaleString(undefined, {
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
                {r.title ?? "(untitled session)"}
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
}: {
  sources: BannerSource[];
  fellBack: boolean;
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
          <span>No data sources found.</span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Reading from</span>
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
            sample data
          </Badge>
        )}
      </div>
    </div>
  );
}
