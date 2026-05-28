import { isCloudflareRuntime } from "@/lib/runtime";

export async function POST(req: Request): Promise<Response> {
  if (isCloudflareRuntime()) {
    const { POST: postCloudflare } = await import("./cloudflare-handler");
    return postCloudflare(req);
  }
  const { POST: postNode } = await import("./node-handler");
  return postNode(req);
}
