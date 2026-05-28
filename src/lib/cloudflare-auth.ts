import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, type User } from "./auth";
import { getTokenusageD1, type TokenusageD1Database } from "./cloudflare-bindings";
import { hashToken } from "./token-hash";

export async function readCurrentUserD1(): Promise<User | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getTokenusageD1();
  const row = await db
    .prepare(
      `SELECT u.id AS id, u.username AS username, u.email AS email,
              u.is_admin AS is_admin, u.last_ip_at AS last_ip_at,
              u.activated_at AS activated_at,
              s.expires_at AS expires_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .bind(hashToken(token))
    .first<{
      id: number;
      username: string;
      email: string | null;
      is_admin: number;
      last_ip_at: number | null;
      activated_at: number | null;
      expires_at: number;
    }>();
  if (!row || row.expires_at <= Date.now()) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: row.is_admin === 1,
    activatedAt: row.activated_at,
    lastIpAt: row.last_ip_at,
  };
}

export async function authenticateApiTokenD1(
  db: TokenusageD1Database,
  plaintext: string
): Promise<User | null> {
  if (!plaintext.startsWith("tu_")) return null;
  const row = await db
    .prepare(
      `SELECT u.id AS id, u.username AS username, u.email AS email,
              u.is_admin AS is_admin, u.activated_at AS activated_at,
              t.id AS token_id
       FROM api_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ?`
    )
    .bind(hashToken(plaintext))
    .first<{
      id: number;
      username: string;
      email: string | null;
      is_admin: number;
      activated_at: number | null;
      token_id: number;
    }>();
  if (!row) return null;
  await db.prepare(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`).bind(Date.now(), row.token_id).run();
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: row.is_admin === 1,
    activatedAt: row.activated_at,
  };
}
