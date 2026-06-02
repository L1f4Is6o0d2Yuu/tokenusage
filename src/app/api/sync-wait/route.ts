import type { NextRequest } from "next/server";
import { isCloudflareRuntime } from "@/lib/runtime";

export async function GET(req: NextRequest): Promise<Response> {
  if (isCloudflareRuntime()) {
    const { GET: getCloudflare } = await import("./cloudflare-handler");
    return getCloudflare(req);
  }
  const { GET: getNode } = await import("./node-handler");
  return getNode(req);
}
