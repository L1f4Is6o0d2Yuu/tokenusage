import Link from "next/link";
import { readActivePrices } from "@/lib/pricing";
import { savePricesAction, resetPricesAction } from "./actions";
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
  const { rules, source, sourcePath } = readActivePrices();

  // Render existing rules + one blank row at the end for "add new".
  const rows = [...rules, { match: "", input: 0, output: 0 }];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Price table</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit per-model token prices. All values are in <span className="font-mono">USD per 1M tokens</span>. Match is a case-insensitive regex against the model name.
          </p>
        </div>
        <SourceBadge source={source} path={sourcePath} />
      </header>

      {saved && (
        <Banner tone="success">Saved. Cost estimates refresh on next dashboard load.</Banner>
      )}
      {reset && (
        <Banner tone="info">Override removed. Falling back to bundled defaults.</Banner>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>
            Rules are matched in order — first match wins. Leave a row's <em>match</em> blank to drop it. The last (blank) row is for adding a new rule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePricesAction}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Match (regex)</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Cache R</TableHead>
                  <TableHead className="text-right">Cache W</TableHead>
                  <TableHead className="text-right">Reasoning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <input
                        name={`rule[${i}].match`}
                        defaultValue={r.match}
                        placeholder="e.g. ^gpt-5"
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
              <button
                type="submit"
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              >
                Save override
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {source === "override" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Reset</CardTitle>
            <CardDescription>
              Delete <span className="font-mono">data/prices.json</span> and fall back to <span className="font-mono">data/prices.default.json</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resetPricesAction}>
              <button
                type="submit"
                className="rounded-md border border-amber-600 bg-background px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300"
              >
                Reset to defaults
              </button>
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
}: {
  source: "override" | "default" | "missing";
  path: string;
}) {
  if (source === "override")
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge>override active</Badge>
        <span className="font-mono">{path}</span>
      </div>
    );
  if (source === "default")
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">defaults</Badge>
        <span className="font-mono">{path}</span>
      </div>
    );
  return (
    <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
      no price file
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
