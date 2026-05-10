import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRecords } from "@/lib/adapters";
import { formatInt, formatTokens, formatUsd } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatTs(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString();
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

export default async function SessionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

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
        ← Back to dashboard
      </Link>
      <header className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{r.provider}</Badge>
          {r.source && <span>· {r.source}</span>}
          {r.model && <span>· {r.model}</span>}
          <span>· {r.id}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {r.title ?? "(untitled session)"}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total tokens" value={formatTokens(totalTokens)} hint={formatInt(totalTokens)} />
        <Stat
          label="Cost"
          value={
            r.costUsd == null
              ? "—"
              : formatUsd(r.costUsd, { precise: true })
          }
          hint={r.costStatus ?? "unknown"}
        />
        <Stat label="Started" value={formatTs(r.startedAt)} />
        <Stat
          label="Duration"
          value={formatDuration(r.startedAt, r.endedAt)}
          hint={r.endedAt ? `ended ${formatTs(r.endedAt)}` : "still open"}
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Token breakdown</CardTitle>
            <CardDescription>Captured by the source adapter at session close.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <KV label="Input" value={formatInt(r.inputTokens)} />
              <KV label="Output" value={formatInt(r.outputTokens)} />
              <KV label="Reasoning" value={formatInt(r.reasoningTokens)} />
              <KV label="Cache read" value={formatInt(r.cacheReadTokens)} />
              <KV label="Cache write" value={formatInt(r.cacheWriteTokens)} />
              <KV label="API calls" value={formatInt(r.apiCallCount)} />
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
