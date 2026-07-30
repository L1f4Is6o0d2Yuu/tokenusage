import type { NextRequest } from "next/server";
import { authenticateApiToken, recordAgentVersion } from "@/lib/auth";
import { getUserSyncState } from "@/lib/sync-state";
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
  const user = await authenticateApiToken(auth.slice(7).trim(), touchModeFor(reason));
  if (!user) return err(401, "invalid token");

  const reportedVersion = req.headers.get("x-agent-version");
  if (reportedVersion) await recordAgentVersion(user.id, reportedVersion);

  const state = await getUserSyncState(user.id);
  return Response.json(buildCheckinResponse(state, resolveUploadServer()));
}
