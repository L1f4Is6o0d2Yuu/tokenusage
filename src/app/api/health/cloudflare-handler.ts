import { getTokenusageD1 } from "@/lib/cloudflare-bindings";

const STARTED_AT = Date.now();
const VERSION = process.env.npm_package_version || "unknown";
const BUILD_SHA = process.env.TOKENUSAGE_GIT_SHA || process.env.CF_PAGES_COMMIT_SHA || "unknown";

type CountRow = { n: number };

export async function GET(): Promise<Response> {
  const health = {
    ok: true,
    version: VERSION,
    buildSha: BUILD_SHA,
    mode: "multi" as const,
    runtime: "cloudflare" as const,
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    db: {
      reachable: false,
      path: "d1:TOKENUSAGE_DB",
      users: undefined as number | undefined,
      sessions: undefined as number | undefined,
      activeAuthSessions: undefined as number | undefined,
    },
  };

  try {
    const db = await getTokenusageD1();
    const users = await db.prepare("SELECT COUNT(*) AS n FROM users").first<CountRow>();
    const sessions = await db.prepare("SELECT COUNT(*) AS n FROM sessions_data").first<CountRow>();
    const active = await db
      .prepare("SELECT COUNT(*) AS n FROM auth_sessions WHERE expires_at > ?")
      .bind(Date.now())
      .first<CountRow>();
    health.db = {
      reachable: true,
      path: "d1:TOKENUSAGE_DB",
      users: users?.n ?? 0,
      sessions: sessions?.n ?? 0,
      activeAuthSessions: active?.n ?? 0,
    };
    return jsonResponse(health, 200);
  } catch (err) {
    health.ok = false;
    return jsonResponse(
      health,
      503,
      err instanceof Error ? err.message : "cloudflare d1 error"
    );
  }
}

function jsonResponse(payload: object, status: number, message?: string): Response {
  return new Response(JSON.stringify(message ? { ...payload, message } : payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
