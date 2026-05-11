import "server-only";
import { openServerDb } from "./server-db";

// Light-weight IP → geolocation via ip-api.com. Free, no key, 45 req/min
// per source IP — enough for our admin-only "where did this user log in
// from" use case. Results are cached in the `ip_lookups` table for 30
// days so repeated dashboard renders don't hit the API.
//
// Privacy: only the admin sees this surface. The IP itself is stored on
// the user row; geo is denormalized into ip_lookups so we can flush /
// re-run the API without touching user rows.

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type GeoIp = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const RFC1918 =
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1$|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

function isPrivateIp(ip: string): boolean {
  return RFC1918.test(ip);
}

// Look up an IP. Returns cached row if present and fresh; otherwise hits
// ip-api.com (best-effort, swallows errors so the dashboard still renders)
// and writes the result back to the cache.
export async function lookupGeo(ip: string): Promise<GeoIp> {
  if (!ip || isPrivateIp(ip)) return { country: null, region: null, city: null };

  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT country, region, city, looked_up_at AS lookedUpAt
         FROM ip_lookups WHERE ip = ?`
      )
      .get(ip) as
      | { country: string | null; region: string | null; city: string | null; lookedUpAt: number }
      | undefined;
    if (row && Date.now() - row.lookedUpAt < CACHE_TTL_MS) {
      return { country: row.country, region: row.region, city: row.city };
    }
  } finally {
    db.close();
  }

  // Miss. Hit the API; if it fails or rate-limits, fall back to an empty
  // result and cache nothing (so next render tries again).
  let geo: GeoIp = { country: null, region: null, city: null };
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,regionName,city,status`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (res.ok) {
      const j = (await res.json()) as {
        status?: string;
        country?: string;
        regionName?: string;
        city?: string;
      };
      if (j.status === "success") {
        geo = {
          country: j.country ?? null,
          region: j.regionName ?? null,
          city: j.city ?? null,
        };
      }
    }
  } catch {
    // network / timeout / abort — fall through with empty geo
  }

  // Cache the result (even an empty one with a valid fetch — `ip-api` may
  // return success with all-null fields). If the fetch threw we skip the
  // cache so the next attempt can retry.
  if (geo.country || geo.region || geo.city) {
    const db = openServerDb();
    try {
      db.prepare(
        `INSERT INTO ip_lookups (ip, country, region, city, looked_up_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(ip) DO UPDATE SET
           country = excluded.country,
           region = excluded.region,
           city = excluded.city,
           looked_up_at = excluded.looked_up_at`
      ).run(ip, geo.country, geo.region, geo.city, Date.now());
    } finally {
      db.close();
    }
  }

  return geo;
}

// Format a geo row as "City, Region · Country" with sensible fallbacks.
// Returns null when we have nothing usable to show.
export function formatGeo(geo: GeoIp): string | null {
  const parts: string[] = [];
  if (geo.city) parts.push(geo.city);
  if (geo.region && geo.region !== geo.city) parts.push(geo.region);
  const left = parts.join(", ");
  if (left && geo.country) return `${left} · ${geo.country}`;
  return left || geo.country;
}
