import { redirect } from "next/navigation";
import { loadRecords, countServerRecords } from "@/lib/adapters";
import { type CustomRange, type Period } from "@/lib/types";
import { readCurrentUser } from "@/lib/auth";
import { getUserSyncState, getLatestAgentSeenAt } from "@/lib/sync-state";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { Landing } from "@/components/landing";
import { readActivePrices } from "@/lib/pricing";
import {
  listUserSubscriptions,
  hasFinishedSubscriptionsSetup,
  PLAN_CATALOG,
} from "@/lib/subscriptions";
import { getDictionary, readLocale } from "@/i18n";
import { pickTagline } from "@/i18n/taglines";
import { DashboardClient } from "./dashboard-client";

// Thin server shell. We still do the auth + record fetch + a one-shot read
// of the active price rules here, then hand everything to the client. From
// there the client owns the period state and re-aggregates locally on
// every change — the server CPU stops being on the hot path for clicks.

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
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period: rawPeriod, from, to } = await searchParams;
  const initialPeriod = parsePeriod(rawPeriod);
  const initialCustomRange =
    initialPeriod === "custom" ? parseCustomRange(from, to) : undefined;

  // In multi-user mode, non-signed-in visitors get the marketing
  // landing page (not /login). This is the conversion funnel from
  // shared posters — strangers should see what tokenusage is.
  // Single-user mode skips the landing entirely (no signup story).
  const currentUser = await readCurrentUser();
  if (isMultiUserMode() && currentUser == null) {
    // Bootstrap step: server has zero users yet → send to /signup so
    // the first admin can set up. Otherwise show the landing.
    if (isFirstRun()) redirect("/signup");
    return <Landing inviteRequired={true} />;
  }
  if (!isMultiUserMode() && currentUser == null) {
    // Single-user mode with no auth — fall through to the dashboard
    // as before. (requireUser used to return null in this case.)
  }

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
  const baseDict = await getDictionary(locale);
  // Pick a random tagline per request from the per-locale PUA-tone
  // corpus. Mutating a dict copy here keeps the rest of the i18n
  // plumbing untouched; the client component still reads
  // `t.header.tagline` like before.
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

  // Per-request random seed for the encouragement picker. Generating
  // it server-side and threading it through as a prop keeps SSR and
  // client hydration in sync — they hash off the same string and pick
  // the same line, no first-frame flicker. New seed each refresh
  // means the line rolls fresh, which is what the user expects.
  const mountSeed = Math.floor(Math.random() * 1_000_000_000);

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
      mountSeed={mountSeed}
      activePlans={activePlans}
      locale={locale}
      t={t}
      showOnboarding={showOnboarding}
      syncState={syncState}
      agentSeenAt={agentSeenAt}
    />
  );
}
