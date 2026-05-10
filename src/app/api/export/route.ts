import type { NextRequest } from "next/server";
import { loadRecords } from "@/lib/adapters";
import { aggregate, filterByPeriod } from "@/lib/aggregate";
import type { CustomRange, Period } from "@/lib/types";

const VALID: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all", "custom"];

function parsePeriod(raw: string | null): Period {
  if (raw && (VALID as string[]).includes(raw)) return raw as Period;
  return "7d";
}

function parseCustomRange(from: string | null, to: string | null): CustomRange | undefined {
  const f = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
  const t = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null;
  if (!f && !t) return undefined;
  return { from: f ?? "", to: t ?? "" };
}

function csvEscape(v: string | number | null): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const period = parsePeriod(sp.get("period"));
  const custom = period === "custom" ? parseCustomRange(sp.get("from"), sp.get("to")) : undefined;

  const { records } = await loadRecords();
  const scoped = filterByPeriod(records, period, custom);
  const agg = aggregate(scoped);

  const header = [
    "provider",
    "model",
    "sessions",
    "input_tokens",
    "output_tokens",
    "cache_read_tokens",
    "cache_write_tokens",
    "reasoning_tokens",
    "total_tokens",
    "cost_usd",
    "cost_known",
  ];
  const lines = [header.join(",")];
  for (const m of agg.byModel) {
    lines.push(
      [
        m.provider,
        m.model,
        m.records,
        m.inputTokens,
        m.outputTokens,
        m.cacheReadTokens,
        m.cacheWriteTokens,
        m.reasoningTokens,
        m.totalTokens,
        m.costUsd.toFixed(6),
        m.costKnown ? "true" : "false",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  const body = lines.join("\n") + "\n";

  const periodLabel = period === "custom" && custom ? `${custom.from || "any"}_to_${custom.to || "now"}` : period;
  const filename = `tokenusage-${periodLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
