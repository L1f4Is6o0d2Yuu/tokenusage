import "server-only";
import { headers } from "next/headers";

// Returns the user-facing origin (e.g. https://tokenusage.online) so that
// links and curl snippets shown in the UI are pasteable on any machine.
//
// Order: explicit TOKENUSAGE_PUBLIC_URL env var → X-Forwarded headers from
// the reverse proxy → Host header → localhost fallback.
export async function getPublicUrl(): Promise<string> {
  if (process.env.TOKENUSAGE_PUBLIC_URL) {
    return process.env.TOKENUSAGE_PUBLIC_URL.replace(/\/$/, "");
  }
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
