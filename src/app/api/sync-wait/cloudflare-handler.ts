import type { NextRequest } from "next/server";
import { getTokenusageD1 } from "@/lib/cloudflare-bindings";
import { authenticateApiTokenD1 } from "@/lib/cloudflare-auth";
import {
  getUserSyncStateD1,
  recordAgentVersionD1,
} from "@/lib/cloudflare-sync-state";

// CF handler: no long-poll. Workers can't share an EventEmitter across
// isolates, and a sustained hold on a free-plan Worker isn't cheap.
// Agents already poll on `syncIntervalSeconds` (default 5 min); they
// just won't pick up a manual "立即同步" click until the next cycle.
//
// If we need sub-interval responsiveness later, the right tool is a
// Durable Object per user that the dashboard's sync-now action wakes
// up — out of scope for the first cutover.
function getUploadServer(): string | null {
  // Workers ignores TOKENUSAGE_UPLOAD_SERVER for now — direct domain
  // is moot when the Worker is the upload target. Surface explicit
  // overrides via wrangler vars if a future deploy needs them.
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
  const db = await getTokenusageD1();
  const user = await authenticateApiTokenD1(db, auth.slice(7).trim());
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) await recordAgentVersionD1(user.id, reportedVersion);

  const state = await getUserSyncStateD1(user.id);
  const uploadServer = getUploadServer();

  // Honor the agent's existing protocol: report whether a sync is
  // pending (paused users always sync=false). The agent decides
  // when to retry based on intervalSeconds in the response.
  const pending =
    state.syncRequestedAt != null &&
    (state.lastUploadedAt == null || state.syncRequestedAt > state.lastUploadedAt);

  return Response.json({
    sync: !state.paused && pending,
    paused: state.paused,
    intervalSeconds: state.syncIntervalSeconds,
    uploadServer,
  });
}
