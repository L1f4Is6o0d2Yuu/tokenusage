import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRecords } from "@/lib/adapters";
import { formatInt, formatTokens, formatUsd } from "@/lib/format";
import { getDictionary, readLocale } from "@/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/i18n/types";

function formatTs(ms: number | null, locale: string): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString(locale);
}

function formatDuration(start: number, end: number | null): string {
  if (end == null) return "—";
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

function statusLabel(s: string | null, t: Dictionary["session"]["costStatus"]): string {
  if (s === "estimated") return t.estimated;
  if (s === "unpriced") return t.unpriced;
  return t.unknown;
}

export default async function SessionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  const locale = await readLocale();
  const t = await getDictionary(locale);

  const { records } = await loadRecords();
  const r = records.find((x) => x.id === id);
  if (!r) notFound();

  const totalTokens =
    r.inputTokens +
    r.outputTokens +
    r.cacheReadTokens +
    r.cacheWriteTokens +
    r.reasoningTokens;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {t.session.back}
      </Link>
      <header className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{r.provider}</Badge>
          {r.source && <span>· {r.source}</span>}
          {r.model && <span>· {r.model}</span>}
          <span>· {r.id}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {r.title ?? t.session.untitled}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t.session.totalTokens}
          value={formatTokens(totalTokens)}
          hint={formatInt(totalTokens)}
        />
        <Stat
          label={t.session.cost}
          value={r.costUsd == null ? "—" : formatUsd(r.costUsd, { precise: true })}
          hint={statusLabel(r.costStatus, t.session.costStatus)}
        />
        <Stat label={t.session.started} value={formatTs(r.startedAt, locale)} />
        <Stat
          label={t.session.duration}
          value={formatDuration(r.startedAt, r.endedAt)}
          hint={
            r.endedAt
              ? t.session.endedAt(formatTs(r.endedAt, locale))
              : t.session.stillOpen
          }
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.session.breakdownTitle}</CardTitle>
            <CardDescription>{t.session.breakdownDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <KV label={t.session.fields.input} value={formatInt(r.inputTokens)} />
              <KV label={t.session.fields.output} value={formatInt(r.outputTokens)} />
              <KV label={t.session.fields.reasoning} value={formatInt(r.reasoningTokens)} />
              <KV label={t.session.fields.cacheRead} value={formatInt(r.cacheReadTokens)} />
              <KV label={t.session.fields.cacheWrite} value={formatInt(r.cacheWriteTokens)} />
              <KV label={t.session.fields.apiCalls} value={formatInt(r.apiCallCount)} />
            </dl>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      )}
    </Card>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
