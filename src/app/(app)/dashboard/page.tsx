import { redirect } from "next/navigation";
import { loadRecords, countServerRecords } from "@/lib/adapters";
import { type CustomRange, type Period } from "@/lib/types";
import { readCurrentUser } from "@/lib/auth";
import { getUserSyncState, getLatestAgentSeenAt } from "@/lib/sync-state";
import { isMultiUserMode } from "@/lib/server-db";
import { readActivePrices } from "@/lib/pricing";
import {
  listUserSubscriptions,
  hasFinishedSubscriptionsSetup,
  PLAN_CATALOG,
} from "@/lib/subscriptions";
import { getDictionary, readLocale } from "@/i18n";
import { pickTagline } from "@/i18n/taglines";
import { DashboardClient } from "../dashboard-client";

// The logged-in app home. /  is now the public landing page; users
// who've signed in are redirected here, and "back to dashboard" links
// across the app point at /dashboard.

const VALID_PERIODS: Period[] = ["1h", "today", "24h", "7d", "30d", "month", "year", "all", "custom"];

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
  searchParams: Promise<{ period?: string; from?: string; to?: string; settings?: string }>;
}) {
  const { period: rawPeriod, from, to, settings } = await searchParams;
  const initialPeriod = parsePeriod(rawPeriod);
  const initialCustomRange =
    initialPeriod === "custom" ? parseCustomRange(from, to) : undefined;

  const currentUser = await readCurrentUser();
  // In multi-user mode this page is auth-only. Visitors land on `/`
  // for marketing; only signed-in users get here.
  if (isMultiUserMode() && currentUser == null) redirect("/");

  // Empty-state guard: zero sessions → /install (live status checklist).
  if (
    isMultiUserMode() &&
    currentUser != null &&
    countServerRecords(currentUser.id) === 0 &&
    settings !== "saved"
  ) {
    redirect("/install");
  }
  // First proper visit hasn't been through the arsenal picker yet.
  if (
    isMultiUserMode() &&
    currentUser != null &&
    !hasFinishedSubscriptionsSetup(currentUser.id)
  ) {
    redirect("/subscriptions?welcome=1");
  }
  const locale = await readLocale();
  const baseDict = await getDictionary(locale);
  // Random PUA-tone tagline per request from src/i18n/taglines.ts.
  const t = {
    ...baseDict,
    header: { ...baseDict.header, tagline: pickTagline(locale) },
  };

  const { records, sources, fellBackToSample, mode } = await loadRecords();

  const showOnboarding =
    mode === "multi" && currentUser != null && countServerRecords(currentUser.id) === 0;
  const syncState =
    mode === "multi" && currentUser != null ? getUserSyncState(currentUser.id) : null;
  const agentSeenAt =
    mode === "multi" && currentUser != null ? getLatestAgentSeenAt(currentUser.id) : null;

  const { rules } = readActivePrices();

  const mountSeed = Math.floor(Math.random() * 1_000_000_000);

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
      mountSeed={mountSeed}
      activePlans={activePlans}
      locale={locale}
      t={t}
      showOnboarding={showOnboarding}
      syncState={syncState}
      agentSeenAt={agentSeenAt}
      settingsSaved={settings === "saved"}
    />
  );
}
