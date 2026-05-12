import { readCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Best-effort IP → city/country lookup. Used by the share button to
// stamp the poster with «macOS · Apple Silicon · Shanghai». Auth-gated
// (only signed-in users can use this) so we don't act as a free geo
// proxy for the public internet.
//
// Geo provider: ipapi.co — free 1k/day per IP. We cache results
// in-process for 1h per IP so a user clicking save 10× in a row only
// triggers one lookup.
type GeoEntry = { ts: number; city: string; country: string };
const geoCache = new Map<string, GeoEntry>();
const TTL_MS = 60 * 60 * 1000;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

async function lookup(ip: string): Promise<{ city: string; country: string }> {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { city: "", country: "" };
  }
  const hit = geoCache.get(ip);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return { city: hit.city, country: hit.country };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { city: "", country: "" };
    const j: { city?: string; country_name?: string; country?: string } =
      await r.json();
    const out = {
      city: j.city ?? "",
      country: j.country_name ?? j.country ?? "",
    };
    geoCache.set(ip, { ts: Date.now(), ...out });
    return out;
  } catch {
    return { city: "", country: "" };
  }
}

export async function GET(req: Request) {
  const user = await readCurrentUser();
  if (!user) return new Response("not signed in", { status: 401 });
  const ip = clientIp(req);
  const geo = await lookup(ip);
  return Response.json(geo);
}
