import { readCurrentUser } from "@/lib/auth";
import { createShare } from "@/lib/shares";

export const runtime = "nodejs";

// Cap on uploaded PNG size — 1080×1920 PNG is ~1.5MB; leave headroom
// for future variants but don't accept truly huge payloads.
const MAX_BYTES = 4 * 1024 * 1024;

// Accepts the client-rendered share PNG + metadata, stores it on
// disk, and returns the public slug. Auth-gated — only signed-in
// users can publish a share. The returned URL is /s/<slug> and is
// public-by-link (no auth needed to view).
export async function POST(req: Request) {
  const user = await readCurrentUser();
  if (!user) return new Response("not signed in", { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.startsWith("multipart/form-data")) {
    return new Response("expected multipart/form-data", { status: 415 });
  }

  const form = await req.formData();
  const file = form.get("png");
  const period = form.get("period");
  if (!(file instanceof Blob)) {
    return new Response("missing png", { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return new Response("png size out of range", { status: 413 });
  }
  if (typeof period !== "string" || period.length === 0 || period.length > 16) {
    return new Response("invalid period", { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Sanity-check the PNG magic bytes — refuse anything that isn't a
  // PNG so the disk doesn't fill up with arbitrary uploads.
  const isPng =
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;
  if (!isPng) return new Response("not a png", { status: 400 });

  const apiValueRaw = form.get("apiValueUsd");
  const apiValueUsd =
    typeof apiValueRaw === "string" && apiValueRaw.length > 0
      ? Number(apiValueRaw)
      : undefined;
  const multiplier = form.get("multiplier");
  const taunt = form.get("taunt");

  const share = createShare({
    userId: user.id,
    period,
    pngBytes: buf,
    apiValueUsd: Number.isFinite(apiValueUsd) ? apiValueUsd : undefined,
    multiplier: typeof multiplier === "string" ? multiplier.slice(0, 64) : undefined,
    taunt: typeof taunt === "string" ? taunt.slice(0, 280) : undefined,
  });

  return Response.json({
    slug: share.slug,
    url: `/s/${share.slug}`,
  });
}
