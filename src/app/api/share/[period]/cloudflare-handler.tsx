// Server-side rendering of the 1080×1920 share poster needs more CPU
// than Workers' free tier allows — `next/og` + Satori + Noto Sans SC
// glyph layout consistently exceeded the 10ms budget even after
// dropping to half resolution. The route is documented in the
// dashboard's share UI as "open in new tab to save the image"; on the
// CF runtime we return a 501 with a clear message and let the
// client-side share flow (which renders the PNG in the browser and
// POSTs to /api/share/save → R2) carry the feature. Moving staging to
// Workers Paid ($5/mo, 30s CPU per request) would unblock this route
// without code changes.

const HINT = [
  "Server-side poster render is unavailable on the Cloudflare runtime",
  "(Workers free tier caps CPU at 10ms per request, and next/og can't",
  "lay out 1080×1920 + CJK fonts inside that). The dashboard's Save",
  "button still works — it renders the PNG in the browser and uploads",
  "to /api/share/save, which is fully supported here.",
].join(" ");

export async function GET(): Promise<Response> {
  return new Response(HINT, {
    status: 501,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
