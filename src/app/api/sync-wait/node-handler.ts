import type { NextRequest } from "next/server";
import { authenticateApiToken, recordAgentVersion } from "@/lib/auth";
import { getUserSyncState } from "@/lib/sync-state";
import { waitSync } from "@/lib/sync-events";

// Server-side maximum hold. We're behind Cloudflare's orange-cloud proxy
// (Free plan), which cuts any connection at 100s with a hard TCP reset.
// Holding longer than that leaves the agent seeing "connection reset"
// every cycle instead of a clean `{ sync: false }` response. 90s gives
// us a safety margin under the limit while still amortising reconnect
// cost across most idle minutes.
const MAX_HOLD_MS = 90 * 1000;

function getUploadServer(): string | null {
  const explicit = process.env.TOKENUSAGE_UPLOAD_SERVER;
  if (explicit) return explicit;
  const direct = process.env.TOKENUSAGE_DIRECT_DOMAIN;
  return direct ? `https://${direct}` : null;
}

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return err(401, "missing bearer token");
  const user = await authenticateApiToken(auth.slice(7).trim());
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) await recordAgentVersion(user.id, reportedVersion);

  const state = await getUserSyncState(user.id);
  const userIntervalMs = state.syncIntervalSeconds * 1000;
  const holdMs = Math.min(userIntervalMs, MAX_HOLD_MS);
  const uploadServer = getUploadServer();

  if (
    state.paused ||
    (state.syncRequestedAt != null &&
      (state.lastUploadedAt == null || state.syncRequestedAt > state.lastUploadedAt))
  ) {
    return Response.json({
      sync: !state.paused && state.syncRequestedAt != null,
      paused: state.paused,
      intervalSeconds: state.syncIntervalSeconds,
      uploadServer,
    });
  }

  const triggered = await waitSync(user.id, holdMs);
  const after = await getUserSyncState(user.id);
  return Response.json({
    sync: triggered && !after.paused,
    paused: after.paused,
    intervalSeconds: after.syncIntervalSeconds,
    uploadServer,
  });
}
