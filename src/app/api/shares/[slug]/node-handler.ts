import fs from "fs";
import { getShareBySlug, shareFilePath } from "@/lib/shares";

export const runtime = "nodejs";

// Serves the saved share PNG by slug. Public — no auth needed; the
// URL itself is the bearer token (12-char base62 → 71 bits of entropy,
// not enumerable). Returns 404 for revoked shares.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!/^[A-Za-z0-9]{6,32}$/.test(slug)) {
    return new Response("not found", { status: 404 });
  }
  const share = getShareBySlug(slug);
  if (!share || share.revokedAt != null) {
    return new Response("not found", { status: 404 });
  }
  try {
    const buf = fs.readFileSync(shareFilePath(slug));
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400, immutable",
        "content-disposition": `inline; filename="tokenusage-${share.period}.png"`,
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
