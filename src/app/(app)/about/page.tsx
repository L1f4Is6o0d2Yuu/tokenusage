import Link from "next/link";
import { getDictionary } from "@/i18n";
import { requireUser } from "@/lib/auth-guard";
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

// Per-provider rows are intentionally non-localized: paths, field names, and
// technical jargon are universally read in English and translating them only
// adds noise. The section labels above the table come from the dictionary.
const SOURCES = [
  {
    provider: "Claude Code CLI",
    where: "~/.claude/projects/**/*.jsonl",
    what:
      "Per-call message.usage from each assistant turn — input, output, cache_read, cache_creation tokens. Deduped by message.id.",
  },
  {
    provider: "Codex CLI",
    where: "~/.codex/state_5.sqlite + ~/.codex/sessions/**.jsonl",
    what:
      "Cumulative total_token_usage from the last token_count event of each thread (input, output, cached, reasoning).",
  },
  {
    provider: "Hermes gateway",
    where: "~/.hermes/state.db",
    what:
      "One row per session — input, output, cache_read/write tokens. Uses actual_cost_usd when recorded, otherwise estimated_cost_usd.",
  },
] as const;

const UNTRACKED = [
  "Claude desktop app — closed protocol, no local usage logs, no public API for Pro/Max accounts.",
  "ChatGPT desktop & web — same situation: usage is not exposed to non-API customers.",
  "Sessions whose log files have been deleted — local data is the only source.",
  "Other machines you haven't synced — single-user mode only sees the local machine. Use multi-user mode (server + agents) to merge.",
] as const;

export default async function AboutPage() {
  await requireUser();
  const t = (await getDictionary()).about;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t.back}
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>
      </header>

      {/* Buffet metaphor up top — explains the whole point of the
          product without leading with a schema diagram. */}
      <Card className="mb-6 border-accent/30 bg-accent/5">
        <CardHeader>
          <CardTitle>{t.buffetTitle}</CardTitle>
          <CardDescription className="text-foreground/80">
            {t.buffetIntro}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>{t.buffetPara1}</p>
          <p>{t.buffetPara2}</p>
          <p>{t.buffetPara3}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.trackedTitle}</CardTitle>
          <CardDescription>{t.trackedIntro}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{t.colSource}</TableHead>
                <TableHead>{t.colWhere}</TableHead>
                <TableHead>{t.colWhat}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SOURCES.map((s) => (
                <TableRow key={s.provider}>
                  <TableCell>
                    <Badge variant="outline">{s.provider}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.where}
                  </TableCell>
                  <TableCell className="text-xs leading-relaxed">
                    {s.what}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.untrackedTitle}</CardTitle>
          <CardDescription>{t.untrackedIntro}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {UNTRACKED.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.costTitle}</CardTitle>
          <CardDescription>{t.costIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded border bg-muted/40 px-4 py-3 font-mono text-xs leading-relaxed">
            <code>{`cost =  input       × inputRate
      + output      × outputRate
      + cacheRead   × cacheReadRate    (default: 10% of input)
      + cacheWrite  × cacheWriteRate   (default: 125% of input)
      + reasoning   × reasoningRate    (default: same as output)`}</code>
          </pre>
          <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
            <span
              className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500"
              aria-hidden
            />
            <p className="text-muted-foreground">{t.costNote}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.dedupTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.dedupIntro}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.privacyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.privacyIntro}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
