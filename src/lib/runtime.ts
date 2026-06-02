export function isCloudflareRuntime(): boolean {
  return (
    process.env.TOKENUSAGE_RUNTIME === "cloudflare" ||
    process.env.TOKENUSAGE_CLOUDFLARE === "1"
  );
}
