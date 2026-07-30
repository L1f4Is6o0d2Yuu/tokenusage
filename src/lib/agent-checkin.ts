import "server-only";
import { AGENT_HEARTBEAT_INTERVAL_MS } from "./agent-health";
import type { UserSyncState } from "./sync-state";

// Shared shape + policy for /api/agent-checkin, so the Node and Workers
// handlers can't drift apart. Both runtimes authenticate, read sync state,
// and hand the result here.

// How often the agent rescans its local source dirs. This is a *local*
// stat() sweep, not a network call — it costs nothing on either side, so
// it can be tight enough that a finished Claude session shows up on the
// dashboard within about half a minute.
export const AGENT_SCAN_INTERVAL_SECONDS = 30;

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
  scanSeconds: number;
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
  return {
    ok: true,
    paused: state.paused,
    syncRequested: !state.paused && isSyncPending(state),
    uploadServer,
    heartbeatSeconds: Math.floor(AGENT_HEARTBEAT_INTERVAL_MS / 1000),
    scanSeconds: AGENT_SCAN_INTERVAL_SECONDS,
  };
}

export function resolveUploadServer(): string | null {
  const explicit = process.env.TOKENUSAGE_UPLOAD_SERVER;
  if (explicit) return explicit;
  const direct = process.env.TOKENUSAGE_DIRECT_DOMAIN;
  return direct ? `https://${direct}` : null;
}
