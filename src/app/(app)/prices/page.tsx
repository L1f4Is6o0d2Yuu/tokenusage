import Link from "next/link";
import { readActivePrices } from "@/lib/pricing";
import { savePricesAction, resetPricesAction } from "./actions";
import { getDictionary } from "@/i18n";
import { requireUser } from "@/lib/auth-guard";
import { SubmitButton } from "@/components/submit-button";
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

const PER_M = 1_000_000;

function toM(n: number | undefined): string {
  if (n == null) return "";
  return String(n * PER_M);
}

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string }>;
}) {
  const { saved, reset } = await searchParams;
  await requireUser();
  const t = (await getDictionary()).prices;
  const { rules, source, sourcePath } = readActivePrices();

  const rows = [...rules, { match: "", input: 0, output: 0 }];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {t.back}
      </Link>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
        </div>
        <SourceBadge source={source} path={sourcePath} t={t.badges} />
      </header>

      {saved && <Banner tone="success">{t.saved}</Banner>}
      {reset && <Banner tone="info">{t.resetDone}</Banner>}

      <Card>
        <CardHeader>
          <CardTitle>{t.rulesTitle}</CardTitle>
          <CardDescription>{t.rulesDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePricesAction}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">{t.columns.match}</TableHead>
                  <TableHead className="text-right">{t.columns.input}</TableHead>
                  <TableHead className="text-right">{t.columns.output}</TableHead>
                  <TableHead className="text-right">{t.columns.cacheRead}</TableHead>
                  <TableHead className="text-right">{t.columns.cacheWrite}</TableHead>
                  <TableHead className="text-right">{t.columns.reasoning}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <input
                        name={`rule[${i}].match`}
                        defaultValue={r.match}
                        placeholder="^gpt-5"
                        className="w-full rounded border bg-background px-2 py-1 font-mono text-sm"
                      />
                    </TableCell>
                    <PriceCell name={`rule[${i}].input`} value={r.input} />
                    <PriceCell name={`rule[${i}].output`} value={r.output} />
                    <PriceCell name={`rule[${i}].cacheRead`} value={"cacheRead" in r ? r.cacheRead : undefined} />
                    <PriceCell name={`rule[${i}].cacheWrite`} value={"cacheWrite" in r ? r.cacheWrite : undefined} />
                    <PriceCell name={`rule[${i}].reasoning`} value={"reasoning" in r ? r.reasoning : undefined} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 flex items-center justify-end gap-3">
              <SubmitButton pendingText="Saving…">{t.save}</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {source === "override" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t.resetTitle}</CardTitle>
            <CardDescription>{t.resetDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resetPricesAction}>
              <SubmitButton variant="danger" pendingText="Resetting…">
                {t.resetButton}
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function PriceCell({ name, value }: { name: string; value: number | undefined }) {
  return (
    <TableCell className="text-right">
      <input
        type="number"
        step="0.0001"
        min="0"
        name={name}
        defaultValue={toM(value)}
        placeholder="0"
        className="w-24 rounded border bg-background px-2 py-1 text-right font-mono text-sm tabular-nums"
      />
    </TableCell>
  );
}

function SourceBadge({
  source,
  path,
  t,
}: {
  source: "override" | "default" | "missing";
  path: string;
  t: Dictionary["prices"]["badges"];
}) {
  if (source === "override")
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge>{t.override}</Badge>
        <span className="font-mono">{path}</span>
      </div>
    );
  if (source === "default")
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{t.defaults}</Badge>
        <span className="font-mono">{path}</span>
      </div>
    );
  return (
    <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
      {t.missing}
    </Badge>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "success" | "info";
  children: React.ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return (
    <div className={`mb-6 rounded-md border px-4 py-2 text-sm ${className}`}>
      {children}
    </div>
  );
}
