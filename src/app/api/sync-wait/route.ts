import type { NextRequest } from "next/server";
import { authenticateApiToken } from "@/lib/auth";
import { getUserSyncState } from "@/lib/sync-state";
import { waitSync } from "@/lib/sync-events";

// Server-side maximum hold. Some proxies / NATs kill connections that go
// quiet for too long, so even users who picked "1 hour" get 5-minute hold
// cycles — they just won't trigger heartbeat uploads on every cycle.
const MAX_HOLD_MS = 5 * 60 * 1000;

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return err(401, "missing bearer token");
  const user = authenticateApiToken(auth.slice(7).trim());
  if (!user) return err(401, "invalid token");

  const state = getUserSyncState(user.id);
  const userIntervalMs = state.syncIntervalSeconds * 1000;
  const holdMs = Math.min(userIntervalMs, MAX_HOLD_MS);

  // If the user already clicked "Sync now" since the last successful upload,
  // return immediately so the agent picks up the request. We use the upload
  // timestamp as the "consumed" marker — uploading clears the implicit flag.
  // (We also short-circuit when paused, so the dashboard's pause toggle is
  // reflected in the agent's behaviour without waiting for the long-poll
  // to time out.)
  if (
    state.paused ||
    (state.syncRequestedAt != null &&
      (state.lastUploadedAt == null || state.syncRequestedAt > state.lastUploadedAt))
  ) {
    return Response.json({
      sync: !state.paused && state.syncRequestedAt != null,
      paused: state.paused,
      intervalSeconds: state.syncIntervalSeconds,
    });
  }

  const triggered = await waitSync(user.id, holdMs);
  // Re-read state after the hold — the user may have paused while we waited.
  const after = getUserSyncState(user.id);
  return Response.json({
    sync: triggered && !after.paused,
    paused: after.paused,
    intervalSeconds: after.syncIntervalSeconds,
  });
}
