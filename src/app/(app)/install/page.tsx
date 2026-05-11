import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { isMultiUserMode } from "@/lib/server-db";
import {
  countServerRecords,
} from "@/lib/adapters";
import {
  getUserSyncState,
  getLatestAgentSeenAt,
} from "@/lib/sync-state";
import { listTokens } from "@/lib/auth";
import { getDictionary, readLocale } from "@/i18n";
import { interp } from "@/i18n/interp";
import { InstallAgentButton } from "@/components/install-agent-button";
import { ForceSyncButton } from "@/components/force-sync-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Dedicated install / waiting-for-data page. The dashboard route
// redirects here when a multi-user account has zero sessions yet —
// users no longer land on an empty graph and feel like the product is
// broken. Once the agent has pushed anything (sessions > 0) we bounce
// the visitor back to "/".
//
// The page surfaces a 4-step checklist derived from server state, so
// the user can self-diagnose. Meta-refresh polls every 8s without JS.

const STAGES = ["token", "heartbeat", "upload", "data"] as const;
type Stage = (typeof STAGES)[number];

function relativeTime(ms: number | null, now: number): string {
  if (ms == null) return "—";
  const delta = Math.max(0, now - ms);
  if (delta < 60_000) return `${Math.round(delta / 1000)}s`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
  return `${Math.round(delta / 3_600_000)}h`;
}

export default async function InstallPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (!isMultiUserMode()) redirect("/");

  // Already onboarded → straight to dashboard.
  const sessionCount = countServerRecords(user.id);
  if (sessionCount > 0) redirect("/");

  const locale = await readLocale();
  const dict = await getDictionary(locale);
  const t = dict.install;
  const ot = dict.onboarding;

  const tokens = listTokens(user.id);
  const syncState = getUserSyncState(user.id);
  const lastAgentSeen = getLatestAgentSeenAt(user.id);
  const now = Date.now();

  const stages: Record<Stage, { done: boolean; detail: string }> = {
    token: {
      done: tokens.length > 0,
      detail: tokens.length > 0 ? `${tokens.length}` : "0",
    },
    heartbeat: {
      done: lastAgentSeen != null,
      detail: lastAgentSeen != null ? `${relativeTime(lastAgentSeen, now)} ago` : "—",
    },
    upload: {
      done: syncState?.lastUploadedAt != null,
      detail:
        syncState?.lastUploadedAt != null
          ? `${relativeTime(syncState.lastUploadedAt, now)} ago`
          : "—",
    },
    data: {
      done: sessionCount > 0,
      detail: `${sessionCount} sessions`,
    },
  };

  // Pick the friendliest single-line diagnosis based on which stage stalled.
  let diagnosis = ot.diagnoseInitial;
  if (stages.token.done && !stages.heartbeat.done) diagnosis = ot.diagnoseNoHeartbeat;
  if (stages.heartbeat.done && !stages.upload.done) diagnosis = ot.diagnoseNoUpload;
  if (stages.upload.done && !stages.data.done) diagnosis = ot.diagnoseEmptyUpload;

  return (
    <>
      {/* No-JS auto-refresh — bumps the user along when the agent finally
          reports in. The dashboard redirect at the top of this file
          takes over the moment sessions > 0. */}
      <meta httpEquiv="refresh" content="8" />

      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-subtle bg-bg-app/85 px-6 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-base font-medium tracking-tight text-fg-strong">
            {ot.installTitle}
          </h1>
          <p className="truncate text-[12px] text-fg-muted">{ot.installSubtitle}</p>
        </div>
        <ForceSyncButton label={ot.syncNow} pendingLabel={ot.syncing} />
      </header>

      <div className="flex-1 px-6 py-8">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>{interp(ot.welcome, { name: user.username })}</CardTitle>
            <CardDescription>{ot.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div>
              <div className="mb-2 font-medium text-foreground">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-mono text-background">
                  1
                </span>
                {ot.step1Title}
              </div>
              <InstallAgentButton t={t} />
            </div>

            <div>
              <div className="mb-2 font-medium text-foreground">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-mono text-background">
                  2
                </span>
                {ot.step2Title}
              </div>
              <p className="text-muted-foreground">{ot.step2Body}</p>
            </div>

            {/* Live status checklist — exposes server-side signals so the
                user knows whether they're stuck at install, heartbeat,
                or empty payload. */}
            <div className="rounded-md border border-border-subtle bg-bg-panel-2/40 p-4">
              <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
                {ot.statusTitle}
              </div>
              <ul className="space-y-2">
                {STAGES.map((s, i) => {
                  const { done, detail } = stages[s];
                  return (
                    <li
                      key={s}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className={
                          done
                            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success"
                            : i === STAGES.findIndex((k) => !stages[k].done)
                              ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning"
                              : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-panel-2 text-fg-faint"
                        }
                      >
                        {done ? "✓" : "·"}
                      </span>
                      <span className={done ? "text-fg-default" : "text-fg-muted"}>
                        {ot.stages[s]}
                      </span>
                      <span className="ml-auto font-mono text-xs text-fg-muted">
                        {detail}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-fg-muted">{diagnosis}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
