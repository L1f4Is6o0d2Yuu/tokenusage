import { getShareBySlugD1, getSharePngR2 } from "@/lib/cloudflare-shares";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!/^[A-Za-z0-9]{6,32}$/.test(slug)) return new Response("not found", { status: 404 });
  const share = await getShareBySlugD1(slug);
  if (!share || share.revokedAt != null) return new Response("not found", { status: 404 });
  const bytes = await getSharePngR2(slug);
  if (!bytes) return new Response("not found", { status: 404 });
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, immutable",
      "content-disposition": `inline; filename="tokenusage-${share.period}.png"`,
    },
  });
}
