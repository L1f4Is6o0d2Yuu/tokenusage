import { isCloudflareRuntime } from "@/lib/runtime";

// Server-side poster render. The dashboard's per-KPI Share2 icons
// open this route in a new tab, so the browser does the
// "save image as" dance and the no-store header in the handler means
// closing the tab forgets the bytes.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ period: string }> }
) {
  if (isCloudflareRuntime()) {
    const { GET: getCloudflare } = await import("./cloudflare-handler");
    return getCloudflare();
  }
  const { GET: getNode } = await import("./node-handler");
  return getNode(req, ctx);
}
