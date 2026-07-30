import type { NextRequest } from "next/server";
import { getTokenusageD1 } from "@/lib/cloudflare-bindings";
import { authenticateApiTokenD1 } from "@/lib/cloudflare-auth";
import {
  getUserSyncStateD1,
  recordAgentVersionD1,
} from "@/lib/cloudflare-sync-state";
import { isSyncPending, resolveUploadServer } from "@/lib/agent-checkin";
import { LEGACY_HOLD_MS } from "./legacy-hold";

// DEPRECATED — kept alive only for agents older than v0.28, which run
// `curl /api/sync-wait; sleep 1` forever and have no other pacing.
//
// This handler used to return immediately on Workers, on the theory that a
// sustained hold wasn't cheap. That had it backwards: the hold is the only
// thing throttling these agents, so returning fast degraded the loop from
// one request per ~91s to one per ~1.1s — roughly 79,000 requests per agent
// per day against a 100,000/day free tier, enough for one user to exhaust
// it alone.
//
// So we hold here too. Time spent awaiting burns no CPU on Workers (the
// metered resource), and 90s stays under Cloudflare's 100s proxy cut-off.
//
// New agents use POST /api/agent-checkin and never reach this route.
// Delete once deployed agents have rolled past v0.28.

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
  // "throttled" — a legacy poll carries no new information. This alone
  // cuts a legacy agent from ~1,900 D1 row-writes/day to 2.
  const user = await authenticateApiTokenD1(db, auth.slice(7).trim(), "throttled");
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) await recordAgentVersionD1(user.id, reportedVersion);

  const before = await getUserSyncStateD1(user.id);
  const uploadServer = resolveUploadServer();

  // Something to say right now — answer without holding.
  if (before.paused || isSyncPending(before)) {
    return Response.json({
      sync: !before.paused && isSyncPending(before),
      paused: before.paused,
      intervalSeconds: before.syncIntervalSeconds,
      uploadServer,
      deprecated: true,
    });
  }

  // Nothing to say — hold, so the caller's `sleep 1` can't spin. There's no
  // cross-isolate event bus on Workers, so this is a flat wait rather than
  // the Node side's early release: a legacy agent picks up a manual sync on
  // its next cycle instead of instantly.
  await new Promise((r) => setTimeout(r, LEGACY_HOLD_MS));

  const after = await getUserSyncStateD1(user.id);
  return Response.json({
    sync: !after.paused && isSyncPending(after),
    paused: after.paused,
    intervalSeconds: after.syncIntervalSeconds,
    uploadServer,
    deprecated: true,
  });
}
