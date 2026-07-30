import type { NextRequest } from "next/server";
import { authenticateApiToken, recordAgentVersion } from "@/lib/auth";
import { getUserSyncState } from "@/lib/sync-state";
import { waitSync } from "@/lib/sync-events";
import { isSyncPending, resolveUploadServer } from "@/lib/agent-checkin";
import { LEGACY_HOLD_MS } from "./legacy-hold";

// DEPRECATED — see cloudflare-handler.ts for the full story. Kept only so
// agents older than v0.28, whose sole pacing is this hold plus a `sleep 1`,
// keep running at ~1 request per 91s instead of spinning. New agents use
// POST /api/agent-checkin. Delete once deployed agents have rolled past
// v0.28.

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return err(401, "missing bearer token");
  // "throttled" — a poll carries no new information, so it rewrites
  // last_used_at at most once a day instead of once per cycle.
  const user = await authenticateApiToken(auth.slice(7).trim(), "throttled");
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) await recordAgentVersion(user.id, reportedVersion);

  const state = await getUserSyncState(user.id);
  const holdMs = Math.min(state.syncIntervalSeconds * 1000, LEGACY_HOLD_MS);
  const uploadServer = resolveUploadServer();

  if (state.paused || isSyncPending(state)) {
    return Response.json({
      sync: !state.paused && isSyncPending(state),
      paused: state.paused,
      intervalSeconds: state.syncIntervalSeconds,
      uploadServer,
      deprecated: true,
    });
  }

  const triggered = await waitSync(user.id, holdMs);
  const after = await getUserSyncState(user.id);
  return Response.json({
    sync: triggered && !after.paused,
    paused: after.paused,
    intervalSeconds: after.syncIntervalSeconds,
    uploadServer,
    deprecated: true,
  });
}
