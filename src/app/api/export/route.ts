import type { NextRequest } from "next/server";
import { loadRecords } from "@/lib/adapters";
import { aggregate, filterByPeriod } from "@/lib/aggregate";
import type { Period } from "@/lib/types";

const VALID: Period[] = ["today", "24h", "7d", "30d", "all"];

function parsePeriod(raw: string | null): Period {
  if (raw && (VALID as string[]).includes(raw)) return raw as Period;
  return "7d";
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
  const period = parsePeriod(new URL(req.url).searchParams.get("period"));
  const { records } = await loadRecords();
  const scoped = filterByPeriod(records, period);
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

  const filename = `tokenusage-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
