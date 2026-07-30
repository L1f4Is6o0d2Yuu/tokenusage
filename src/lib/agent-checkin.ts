import "server-only";
import { AGENT_HEARTBEAT_INTERVAL_MS } from "./agent-health";
import type { UserSyncState } from "./sync-state";

// Shared shape + policy for /api/agent-checkin, so the Node and Workers
// handlers can't drift apart. Both runtimes authenticate, read sync state,
// and hand the result here.

// Floor for the agent's local rescan. This is a *local* filesystem sweep,
// not a network call, so right after activity it can be tight enough that a
// finished Claude session reaches the dashboard within about half a minute.
//
// It is only the floor: the agent doubles its scan gap on every idle pass up
// to the user's configured `sync_interval_seconds`, so an idle machine settles
// at that interval rather than walking ~/.claude/projects every 30s forever.
export const AGENT_SCAN_FLOOR_SECONDS = 30;

// Hard lower bound on anything we advertise as a sleep duration. The column is
// `NOT NULL DEFAULT 300` and setSyncInterval() validates against
// VALID_INTERVALS, so a bad value takes a manual write to get in — but the `??`
// default only catches NULL, so a stored 0 would sail through Math.min() and
// tell the agent to sleep 0. That is a local spin, not a request storm, which
// makes it the kind of thing nobody notices except the user whose laptop fan is
// running. Cheaper to clamp than to rely on every writer being careful.
const MIN_ADVERTISED_SECONDS = 5;

function sane(seconds: number, fallback: number): number {
  return Number.isFinite(seconds) && seconds >= MIN_ADVERTISED_SECONDS
    ? Math.floor(seconds)
    : fallback;
}

// Why the agent is calling. This is what decides whether the check-in is
// allowed to spend a D1 row-write on `last_used_at`:
//
//   heartbeat — the daily "still here" ping. Nothing happened; throttled.
//   data      — local files changed, a push is about to follow.
//   manual    — the agent is acting on a dashboard "sync now" request.
//   startup   — the service just came up.
//
// Everything except `heartbeat` is a real event the dashboard should show
// an exact timestamp for, so it forces the write. That yields the intended
// budget: one write per day per idle agent, plus one per actual sync.
export type CheckinReason = "heartbeat" | "data" | "manual" | "startup";

const REAL_WORK: ReadonlySet<string> = new Set(["data", "manual", "startup"]);

export function parseCheckinReason(raw: unknown): CheckinReason {
  return raw === "data" || raw === "manual" || raw === "startup"
    ? raw
    : "heartbeat";
}

export function touchModeFor(reason: CheckinReason): "throttled" | "force" {
  return REAL_WORK.has(reason) ? "force" : "throttled";
}

export type AgentCheckinResponse = {
  ok: true;
  paused: boolean;
  // True when the user pressed "sync now" on the dashboard and no upload
  // has landed since. The agent pushes even if its local fingerprint is
  // unchanged, so the user gets a fresh last-synced stamp.
  syncRequested: boolean;
  // Off-Cloudflare host for the tarball body, when one is configured.
  uploadServer: string | null;
  // Cadence knobs, server-controlled so we can retune deployed agents
  // without shipping a new CLI.
  heartbeatSeconds: number;
  // Floor and ceiling for the agent's local scan gap. It starts at
  // scanSeconds after any activity and doubles each idle pass up to
  // intervalSeconds — the user's existing `sync_interval_seconds` setting,
  // which until now the agent parsed and then ignored.
  scanSeconds: number;
  intervalSeconds: number;
};

// A sync is outstanding when the user asked for one and nothing has been
// uploaded since. Uploading is what clears it — markUploaded() bumps
// last_uploaded_at past sync_requested_at — so there's no separate
// "consume" write to pay for.
export function isSyncPending(state: UserSyncState): boolean {
  return (
    state.syncRequestedAt != null &&
    (state.lastUploadedAt == null ||
      state.syncRequestedAt > state.lastUploadedAt)
  );
}

export function buildCheckinResponse(
  state: UserSyncState,
  uploadServer: string | null
): AgentCheckinResponse {
  const interval = sane(state.syncIntervalSeconds, 300);
  return {
    ok: true,
    paused: state.paused,
    syncRequested: !state.paused && isSyncPending(state),
    uploadServer,
    heartbeatSeconds: Math.floor(AGENT_HEARTBEAT_INTERVAL_MS / 1000),
    // Never advertise a floor above the ceiling — a user who picks the 60s
    // interval would otherwise get a 30s floor clamped against a 60s cap on
    // one side and nothing on the other.
    scanSeconds: Math.min(AGENT_SCAN_FLOOR_SECONDS, interval),
    intervalSeconds: interval,
  };
}

export function resolveUploadServer(): string | null {
  const explicit = process.env.TOKENUSAGE_UPLOAD_SERVER;
  if (explicit) return explicit;
  const direct = process.env.TOKENUSAGE_DIRECT_DOMAIN;
  return direct ? `https://${direct}` : null;
}
