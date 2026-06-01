import { readCurrentUserD1 } from "@/lib/cloudflare-auth";

// CF mirror of the Node handler. The geo cache is per-isolate (each
// Worker instance gets its own Map) which is fine for a soft cache —
// the ipapi.co fallback handles cold isolates.
type GeoEntry = { ts: number; city: string; country: string };
const geoCache = new Map<string, GeoEntry>();
const TTL_MS = 60 * 60 * 1000;

function clientIp(req: Request): string {
  // Workers populates `cf-connecting-ip` for the original client; fall
  // back to the same XFF chain the Node side uses so dev + self-hosted
  // proxies still work.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
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

export async function GET(req: Request): Promise<Response> {
  const user = await readCurrentUserD1();
  if (!user) return new Response("not signed in", { status: 401 });
  const ip = clientIp(req);
  const geo = await lookup(ip);
  return Response.json(geo);
}
