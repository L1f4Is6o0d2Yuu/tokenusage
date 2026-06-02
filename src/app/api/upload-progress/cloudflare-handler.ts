import type { NextRequest } from "next/server";
import { getTokenusageD1 } from "@/lib/cloudflare-bindings";
import { authenticateApiTokenD1 } from "@/lib/cloudflare-auth";
import { recordUploadStartingD1 } from "@/lib/cloudflare-sync-state";

export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return Response.json({ ok: false, message: "missing bearer token" }, { status: 401 });
  }
  const db = await getTokenusageD1();
  const user = await authenticateApiTokenD1(db, auth.slice(7).trim());
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

  await recordUploadStartingD1(user.id, Math.floor(total));
  return Response.json({ ok: true });
}
