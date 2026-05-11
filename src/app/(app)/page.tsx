import { loadRecords, countServerRecords } from "@/lib/adapters";
import { type CustomRange, type Period } from "@/lib/types";
import { requireUser } from "@/lib/auth-guard";
import { getUserSyncState, getLatestAgentSeenAt } from "@/lib/sync-state";
import { readActivePrices } from "@/lib/pricing";
import { getDictionary, readLocale } from "@/i18n";
import { DashboardClient } from "./dashboard-client";

// Thin server shell. We still do the auth + record fetch + a one-shot read
// of the active price rules here, then hand everything to the client. From
// there the client owns the period state and re-aggregates locally on
// every change — the server CPU stops being on the hot path for clicks.

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
  const initialPeriod = parsePeriod(rawPeriod);
  const initialCustomRange =
    initialPeriod === "custom" ? parseCustomRange(from, to) : undefined;

  const currentUser = await requireUser();
  const locale = await readLocale();
  const t = await getDictionary(locale);

  const { records, sources, fellBackToSample, mode } = await loadRecords();

  const showOnboarding =
    mode === "multi" && currentUser != null && countServerRecords(currentUser.id) === 0;
  const syncState =
    mode === "multi" && currentUser != null ? getUserSyncState(currentUser.id) : null;
  const agentSeenAt =
    mode === "multi" && currentUser != null ? getLatestAgentSeenAt(currentUser.id) : null;

  const { rules } = readActivePrices();

  return (
    <DashboardClient
      records={records}
      rules={rules}
      sources={sources.map((s) => ({
        adapter: { label: s.adapter.label },
        recordCount: s.recordCount,
        sourcePath: s.sourcePath,
      }))}
      fellBackToSample={fellBackToSample}
      initialPeriod={initialPeriod}
      initialCustomRange={initialCustomRange}
      username={currentUser?.username ?? null}
      locale={locale}
      t={t}
      showOnboarding={showOnboarding}
      syncState={syncState}
      agentSeenAt={agentSeenAt}
    />
  );
}
