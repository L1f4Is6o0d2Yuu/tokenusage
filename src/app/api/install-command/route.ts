import { isCloudflareRuntime } from "@/lib/runtime";

// One-click install support: dashboard hits this endpoint, gets back a
// fresh API token + ready-to-paste install commands for both Homebrew
// (recommended for Mac) and curl|sh (works on any Mac/Linux).
export async function POST(): Promise<Response> {
  if (isCloudflareRuntime()) {
    const { POST: postCloudflare } = await import("./cloudflare-handler");
    return postCloudflare();
  }
  const { POST: postNode } = await import("./node-handler");
  return postNode();
}
