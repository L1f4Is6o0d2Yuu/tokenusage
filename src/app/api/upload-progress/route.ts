import type { NextRequest } from "next/server";
import { authenticateApiToken } from "@/lib/auth";
import { recordUploadStarting } from "@/lib/sync-state";

// Agent hits this *before* opening the long-lived POST /api/upload
// connection so the dashboard can display a real progress bar from
// the moment the first byte of payload would have flown.
//
// Body: { totalBytes: number, agentVersion?: string }
//
// Response: { ok: true }. Failures are non-fatal — the agent still
// attempts the upload either way, this is purely UI signaling.
export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return Response.json({ ok: false, message: "missing bearer token" }, { status: 401 });
  }
  const user = authenticateApiToken(auth.slice(7).trim());
  if (!user) {
    return Response.json({ ok: false, message: "invalid token" }, { status: 401 });
  }

  let body: { totalBytes?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, message: "body must be JSON" }, { status: 400 });
  }
  const total = Number(body.totalBytes);
  if (!Number.isFinite(total) || total <= 0) {
    return Response.json(
      { ok: false, message: "totalBytes must be a positive number" },
      { status: 400 }
    );
  }

  recordUploadStarting(user.id, Math.floor(total));
  return Response.json({ ok: true });
}
