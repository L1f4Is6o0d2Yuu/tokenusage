import fs from "node:fs";
import { isMultiUserMode, openServerDb, serverDbPath } from "@/lib/server-db";

const STARTED_AT = Date.now();

// Read package.json once at module init for the version field. We avoid
// importing it as a JSON module (would bundle into the chunk) and read at
// runtime instead.
function readVersion(): string {
  try {
    const raw = fs.readFileSync(`${process.cwd()}/package.json`, "utf8");
    return (JSON.parse(raw).version as string) ?? "unknown";
  } catch {
    return "unknown";
  }
}

const VERSION = readVersion();

type Health = {
  ok: boolean;
  version: string;
  mode: "single" | "multi";
  uptimeSeconds: number;
  db: {
    reachable: boolean;
    path: string;
    users?: number;
    sessions?: number;
    activeAuthSessions?: number;
  };
};

export async function GET(): Promise<Response> {
  const multi = isMultiUserMode();
  const dbPath = serverDbPath();
  const health: Health = {
    ok: true,
    version: VERSION,
    mode: multi ? "multi" : "single",
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    db: { reachable: false, path: dbPath },
  };

  // In single-user mode the server DB may not exist. That's expected and
  // healthy — only check stats when the file is there.
  if (fs.existsSync(dbPath)) {
    try {
      const db = openServerDb();
      try {
        const u = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
        const s = db.prepare("SELECT COUNT(*) AS n FROM sessions_data").get() as { n: number };
        const a = db
          .prepare("SELECT COUNT(*) AS n FROM auth_sessions WHERE expires_at > ?")
          .get(Date.now()) as { n: number };
        health.db = {
          reachable: true,
          path: dbPath,
          users: u.n,
          sessions: s.n,
          activeAuthSessions: a.n,
        };
      } finally {
        db.close();
      }
    } catch (err) {
      health.ok = false;
      health.db.reachable = false;
      return jsonResponse(health, 503, err instanceof Error ? err.message : "db error");
    }
  } else {
    // No server.db is fine — server is healthy in single-user posture.
    health.db.reachable = true;
  }

  return jsonResponse(health, 200);
}

function jsonResponse(payload: object, status: number, message?: string): Response {
  return new Response(
    JSON.stringify(message ? { ...payload, message } : payload, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );
}
