import type { NextRequest } from "next/server";
import { isCloudflareRuntime } from "@/lib/runtime";

// Push-model replacement for /api/sync-wait (v0.28).
//
// sync-wait was a long-poll: the agent held a connection open, the server
// held it ~90s, the agent reconnected, forever. That was ~950 requests per
// agent per day on Node — and on Workers, where the handler returned
// immediately, the agent's `sleep 1` loop turned into ~79,000 requests per
// agent per day, enough for a single user to exhaust the free tier.
//
// This endpoint is not polled. The agent calls it only when it has
// something to say: it is about to push new data, or the once-a-day
// heartbeat came due. Idle agents make zero requests.
export async function POST(req: NextRequest): Promise<Response> {
  if (isCloudflareRuntime()) {
    const { POST: postCloudflare } = await import("./cloudflare-handler");
    return postCloudflare(req);
  }
  const { POST: postNode } = await import("./node-handler");
  return postNode(req);
}
