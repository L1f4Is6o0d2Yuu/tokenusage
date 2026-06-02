import { isCloudflareRuntime } from "@/lib/runtime";

export async function GET(): Promise<Response> {
  if (isCloudflareRuntime()) {
    const { GET: getCloudflare } = await import("./cloudflare-handler");
    return getCloudflare();
  }
  const { GET: getNode } = await import("./node-handler");
  return getNode();
}
