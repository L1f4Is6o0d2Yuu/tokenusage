import type { NextRequest } from "next/server";
import { getTokenusageD1 } from "@/lib/cloudflare-bindings";
import { authenticateApiTokenD1 } from "@/lib/cloudflare-auth";
import {
  getUserSyncStateD1,
  recordAgentVersionD1,
} from "@/lib/cloudflare-sync-state";
import {
  buildCheckinResponse,
  parseCheckinReason,
  resolveUploadServer,
  touchModeFor,
} from "@/lib/agent-checkin";

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return err(401, "missing bearer token");
  }
  const reason = parseCheckinReason(
    await req
      .json()
      .then((b: { reason?: unknown }) => b?.reason)
      .catch(() => undefined)
  );
  const db = await getTokenusageD1();
  const user = await authenticateApiTokenD1(
    db,
    auth.slice(7).trim(),
    touchModeFor(reason)
  );
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) await recordAgentVersionD1(user.id, reportedVersion);

  const state = await getUserSyncStateD1(user.id);
  return Response.json(buildCheckinResponse(state, resolveUploadServer()));
}
