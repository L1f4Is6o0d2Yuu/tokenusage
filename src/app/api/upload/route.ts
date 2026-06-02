import { isCloudflareRuntime } from "@/lib/runtime";

export async function POST(req: Request): Promise<Response> {
  if (isCloudflareRuntime()) {
    return new Response(
      JSON.stringify({
        ok: false,
        message:
          "The legacy tarball upload endpoint is not supported on Cloudflare. Use the chunked /api/ingest agent path instead.",
      }),
      {
        status: 410,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }

  const handler = await import("./node-handler");
  return handler.POST(req as never);
}
