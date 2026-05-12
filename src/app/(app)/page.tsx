import { redirect } from "next/navigation";
import { loadRecords, countServerRecords } from "@/lib/adapters";
import { type CustomRange, type Period } from "@/lib/types";
import { requireUser } from "@/lib/auth-guard";
import { getUserSyncState, getLatestAgentSeenAt } from "@/lib/sync-state";
import { isMultiUserMode } from "@/lib/server-db";
import { readActivePrices } from "@/lib/pricing";
import {
  listUserSubscriptions,
  hasFinishedSubscriptionsSetup,
  PLAN_CATALOG,
} from "@/lib/subscriptions";
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
  // Empty-state guard: in multi-user mode, a user with zero sessions
  // hasn't gotten the agent talking to the server yet. Sending them
  // to an empty dashboard reads as "the product is broken" — divert to
  // /install where the same data deficit is framed as the next step,
  // with a live status checklist.
  if (
    isMultiUserMode() &&
    currentUser != null &&
    countServerRecords(currentUser.id) === 0
  ) {
    redirect("/install");
  }
  // Data has arrived, but the user has never been through the arsenal
  // picker yet. Force them through it once so the ROI panel actually
  // means something on their first proper visit. The picker stamps a
  // setup-at timestamp on submit (even empty), so we don't loop.
  if (
    isMultiUserMode() &&
    currentUser != null &&
    !hasFinishedSubscriptionsSetup(currentUser.id)
  ) {
    redirect("/subscriptions?welcome=1");
  }
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

  // Resolve the user's active plan ids to {id, vendor, name, monthlyUsd}
  // so the client can compute ROI without re-resolving the catalog.
  const activePlanIds = currentUser ? listUserSubscriptions(currentUser.id) : [];
  const activePlans = activePlanIds
    .map((id) => PLAN_CATALOG.find((p) => p.id === id))
    .filter((p): p is (typeof PLAN_CATALOG)[number] => p != null)
    .map((p) => ({
      id: p.id,
      vendor: p.vendor,
      name: p.name,
      monthlyUsd: p.monthlyUsd,
      caps: p.caps,
    }));

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
      userId={currentUser?.id ?? null}
      activePlans={activePlans}
      locale={locale}
      t={t}
      showOnboarding={showOnboarding}
      syncState={syncState}
      agentSeenAt={agentSeenAt}
    />
  );
}
