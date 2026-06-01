import type { NextRequest } from "next/server";
import { isCloudflareRuntime } from "@/lib/runtime";

// Agent hits this *before* opening the long-lived POST /api/upload
// connection so the dashboard can display a real progress bar from
// the moment the first byte of payload would have flown.
//
// Body: { totalBytes: number, agentVersion?: string }
// Response: { ok: true }. Failures are non-fatal — the agent still
// attempts the upload either way, this is purely UI signaling.
export async function POST(req: NextRequest): Promise<Response> {
  if (isCloudflareRuntime()) {
    const { POST: postCloudflare } = await import("./cloudflare-handler");
    return postCloudflare(req);
  }
  const { POST: postNode } = await import("./node-handler");
  return postNode(req);
}
