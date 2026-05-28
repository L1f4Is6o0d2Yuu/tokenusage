import { readCurrentUserD1 } from "@/lib/cloudflare-auth";
import { createShareD1R2 } from "@/lib/cloudflare-shares";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await readCurrentUserD1();
  if (!user) return new Response("not signed in", { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.startsWith("multipart/form-data")) {
    return new Response("expected multipart/form-data", { status: 415 });
  }

  const form = await req.formData();
  const file = form.get("png");
  const period = form.get("period");
  if (!(file instanceof Blob)) return new Response("missing png", { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return new Response("png size out of range", { status: 413 });
  }
  if (typeof period !== "string" || period.length === 0 || period.length > 16) {
    return new Response("invalid period", { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const sig = new Uint8Array(bytes.slice(0, 4));
  if (sig.length < 4 || sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4e || sig[3] !== 0x47) {
    return new Response("not a png", { status: 400 });
  }

  const apiValueRaw = form.get("apiValueUsd");
  const apiValueUsd =
    typeof apiValueRaw === "string" && apiValueRaw.length > 0 ? Number(apiValueRaw) : undefined;
  const multiplier = form.get("multiplier");
  const taunt = form.get("taunt");

  const share = await createShareD1R2({
    userId: user.id,
    period,
    pngBytes: bytes,
    apiValueUsd: Number.isFinite(apiValueUsd) ? apiValueUsd : undefined,
    multiplier: typeof multiplier === "string" ? multiplier.slice(0, 64) : undefined,
    taunt: typeof taunt === "string" ? taunt.slice(0, 280) : undefined,
  });

  return Response.json({ slug: share.slug, url: `/s/${share.slug}` });
}
