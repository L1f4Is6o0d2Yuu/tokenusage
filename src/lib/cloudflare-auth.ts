import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  type CreateUserInput,
  type TokenTouchMode,
  type User,
} from "./auth";
import { getTokenusageD1, type TokenusageD1Database } from "./cloudflare-bindings";
import { hashToken } from "./token-hash";
import { shouldWriteAgentSeen } from "./agent-health";

// 30 days — must stay in lockstep with SESSION_TTL_MS in src/lib/auth.ts.
// Imported via the same module would be cleaner, but auth.ts pulls in
// node:fs through server-db; keeping this constant local trades a tiny
// duplication for a clean module boundary.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
  plaintext: string,
  touch: TokenTouchMode = "throttled"
): Promise<User | null> {
  if (!plaintext.startsWith("tu_")) return null;
  const row = await db
    .prepare(
      `SELECT u.id AS id, u.username AS username, u.email AS email,
              u.is_admin AS is_admin, u.activated_at AS activated_at,
              t.id AS token_id, t.last_used_at AS token_last_used_at
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
      token_last_used_at: number | null;
    }>();
  if (!row) return null;
  // See the TokenTouchMode docs in src/lib/auth.ts — on D1 this is the
  // difference between one row-write per agent request and one per day.
  const now = Date.now();
  if (
    touch === "force" ||
    (touch === "throttled" && shouldWriteAgentSeen(row.token_last_used_at, now))
  ) {
    await db
      .prepare(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`)
      .bind(now, row.token_id)
      .run();
  }
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: row.is_admin === 1,
    activatedAt: row.activated_at,
  };
}

// D1 mirror of `createApiToken` from src/lib/auth.ts. Same plaintext
// format (`tu_` + 24 random bytes hex) so existing agents and the
// `tokenusage_secret` env contract stay valid across runtimes.
export async function createApiTokenD1(
  userId: number,
  name: string
): Promise<{ id: number; plaintext: string }> {
  const plaintext = "tu_" + crypto.randomBytes(24).toString("hex");
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `INSERT INTO api_tokens (user_id, name, token_hash, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, name, hashToken(plaintext), Date.now())
    .run();
  // D1's meta.last_row_id is the AUTOINCREMENT id of the row we just
  // inserted. Match the Node side's number type for the public shape.
  const meta = result.meta as { last_row_id?: number } | undefined;
  return { id: Number(meta?.last_row_id ?? 0), plaintext };
}

export async function recordUserIpD1(userId: number, ip: string): Promise<void> {
  if (!ip) return;
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET last_ip = ?, last_ip_at = ? WHERE id = ?`)
    .bind(ip, Date.now(), userId)
    .run();
}

// ---- login / signup write paths ----
//
// hashPassword + verifyPassword are runtime-portable (node:crypto works
// under both `nodejs_compat` and native Node), so we re-use them as-is.
// Only the DB layer differs.

export async function createSessionD1(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const db = await getTokenusageD1();
  await db
    .prepare(
      `INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(hashToken(token), userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function destroySessionD1(token: string): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`)
    .bind(hashToken(token))
    .run();
}

export async function findUserByEmailD1(email: string): Promise<User | null> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(
      `SELECT id, username, email, is_admin, activated_at
       FROM users WHERE lower(email) = lower(?) LIMIT 1`
    )
    .bind(email)
    .first<{
      id: number;
      username: string;
      email: string | null;
      is_admin: number;
      activated_at: number | null;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: row.is_admin === 1,
    activatedAt: row.activated_at,
  };
}

export async function authenticateD1(
  identifier: string,
  password: string
): Promise<User | null> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(
      `SELECT id, username, email, is_admin, password_hash, activated_at
       FROM users WHERE username = ? OR email = ? LIMIT 1`
    )
    .bind(identifier, identifier)
    .first<{
      id: number;
      username: string;
      email: string | null;
      is_admin: number;
      password_hash: string;
      activated_at: number | null;
    }>();
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: row.is_admin === 1,
    activatedAt: row.activated_at,
  };
}

export async function createUserD1(input: CreateUserInput): Promise<User> {
  const now = Date.now();
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `INSERT INTO users (username, email, password_hash, is_admin, created_at, activated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.username,
      input.email ?? null,
      hashPassword(input.password),
      input.isAdmin ? 1 : 0,
      now,
      now
    )
    .run();
  const meta = result.meta as { last_row_id?: number } | undefined;
  return {
    id: Number(meta?.last_row_id ?? 0),
    username: input.username,
    email: input.email ?? null,
    isAdmin: !!input.isAdmin,
    activatedAt: now,
  };
}

// First-run gate equivalent: do we need to bootstrap an admin? Mirrors
// `isFirstRun` from server-db.ts but D1-backed. Used by the signup
// route to decide whether the first user gets is_admin=1.
export async function isFirstRunD1(): Promise<boolean> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM users`)
    .first<{ n: number }>();
  return (row?.n ?? 0) === 0;
}

export type ApiTokenRowD1 = {
  id: number;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
};

export async function listTokensD1(userId: number): Promise<ApiTokenRowD1[]> {
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `SELECT id, name, created_at AS createdAt, last_used_at AS lastUsedAt
       FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<ApiTokenRowD1>();
  return result.results ?? [];
}

export async function revokeApiTokenD1(userId: number, id: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`DELETE FROM api_tokens WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .run();
}

export async function readAgentVersionD1(userId: number): Promise<string | null> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(`SELECT agent_version AS v FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ v: string | null }>();
  return row?.v ?? null;
}

// ---- admin: users + invites ----

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type AdminUserRowD1 = {
  id: number;
  username: string;
  email: string | null;
  isAdmin: boolean;
  createdAt: number;
  activatedAt: number | null;
  passwordResetAt: number | null;
  lastIp: string | null;
  lastIpAt: number | null;
  agentSeenAt: number | null;
  lastUploadedAt: number | null;
  agentVersion: string | null;
};

export async function listUsersD1(): Promise<AdminUserRowD1[]> {
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `SELECT u.id, u.username, u.email, u.is_admin AS isAdmin, u.created_at AS createdAt,
              u.activated_at AS activatedAt,
              u.password_reset_at AS passwordResetAt,
              u.last_ip AS lastIp, u.last_ip_at AS lastIpAt,
              u.last_uploaded_at AS lastUploadedAt,
              u.agent_version AS agentVersion,
              (SELECT MAX(t.last_used_at) FROM api_tokens t WHERE t.user_id = u.id) AS agentSeenAt
       FROM users u ORDER BY u.created_at ASC`
    )
    .all<{
      id: number;
      username: string;
      email: string | null;
      isAdmin: number;
      createdAt: number;
      activatedAt: number | null;
      passwordResetAt: number | null;
      lastIp: string | null;
      lastIpAt: number | null;
      agentSeenAt: number | null;
      lastUploadedAt: number | null;
      agentVersion: string | null;
    }>();
  return (result.results ?? []).map((r) => ({ ...r, isAdmin: r.isAdmin === 1 }));
}

export type InviteRowD1 = {
  id: number;
  code: string | null;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  note: string | null;
};

export async function listInvitesD1(): Promise<InviteRowD1[]> {
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `SELECT id, code, created_at AS createdAt, expires_at AS expiresAt,
              used_at AS usedAt, note
       FROM invite_tokens ORDER BY created_at DESC`
    )
    .all<InviteRowD1>();
  return result.results ?? [];
}

async function generateInviteCodeD1(): Promise<string> {
  const db = await getTokenusageD1();
  for (let i = 0; i < 50; i++) {
    const n = crypto.randomInt(0, 10000).toString().padStart(4, "0");
    const code = `TU${n}`;
    const row = await db
      .prepare(`SELECT 1 AS hit FROM invite_tokens WHERE code = ? LIMIT 1`)
      .bind(code)
      .first<{ hit: number }>();
    if (!row) return code;
  }
  throw new Error("invite code space exhausted — revoke expired invites and retry");
}

export async function createInviteD1(
  adminUserId: number,
  note: string | null
): Promise<{ id: number; plaintext: string }> {
  const code = await generateInviteCodeD1();
  const now = Date.now();
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `INSERT INTO invite_tokens (token_hash, code, created_by, created_at, expires_at, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(hashToken(code), code, adminUserId, now, now + INVITE_TTL_MS, note)
    .run();
  const meta = result.meta as { last_row_id?: number } | undefined;
  return { id: Number(meta?.last_row_id ?? 0), plaintext: code };
}

export async function revokeInviteD1(id: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`DELETE FROM invite_tokens WHERE id = ? AND used_at IS NULL`)
    .bind(id)
    .run();
}

export async function updateInviteNoteD1(id: number, note: string | null): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE invite_tokens SET note = ? WHERE id = ?`)
    .bind(note, id)
    .run();
}

export async function flagPasswordResetD1(userId: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET password_reset_at = ? WHERE id = ?`)
    .bind(Date.now(), userId)
    .run();
}

export async function activateUserD1(userId: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET activated_at = ? WHERE id = ? AND activated_at IS NULL`)
    .bind(Date.now(), userId)
    .run();
}
