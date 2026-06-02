import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  type CreateUserInput,
  type User,
} from "./auth";
import { getTokenusageD1, type TokenusageD1Database } from "./cloudflare-bindings";
import { hashToken } from "./token-hash";

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

// Mirrors findInviteRow in auth.ts: try the short `TU####` code first
// (case-insensitive), then fall back to the legacy hashed `tui_…` token.
async function findInviteRowD1(
  db: TokenusageD1Database,
  plaintext: string
): Promise<{ id: number; expiresAt: number; usedAt: number | null } | null> {
  const trimmed = plaintext.trim();
  const codeKey = /^tu\d{4}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
  const byCode = await db
    .prepare(
      `SELECT id, expires_at AS expiresAt, used_at AS usedAt
       FROM invite_tokens WHERE code = ? LIMIT 1`
    )
    .bind(codeKey)
    .first<{ id: number; expiresAt: number; usedAt: number | null }>();
  if (byCode) return byCode;
  const byHash = await db
    .prepare(
      `SELECT id, expires_at AS expiresAt, used_at AS usedAt
       FROM invite_tokens WHERE token_hash = ? LIMIT 1`
    )
    .bind(hashToken(trimmed))
    .first<{ id: number; expiresAt: number; usedAt: number | null }>();
  return byHash ?? null;
}

export async function lookupInviteD1(
  plaintext: string
): Promise<
  | { ok: true; id: number; expiresAt: number }
  | { ok: false; reason: "not-found" | "expired" | "used" }
> {
  const db = await getTokenusageD1();
  const row = await findInviteRowD1(db, plaintext);
  if (!row) return { ok: false, reason: "not-found" };
  if (row.usedAt != null) return { ok: false, reason: "used" };
  if (row.expiresAt < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, id: row.id, expiresAt: row.expiresAt };
}

// Atomic-ish redemption on D1: validate → batch(INSERT user, UPDATE invite).
// The batch is one txn, so a UNIQUE violation on username/email rolls both
// back. The narrow remaining race is a second redeemer slipping between our
// validate and the batch — they'll either also pass validation and hit the
// UNIQUE constraint (rollback), or the UPDATE's `used_at IS NULL` guard
// catches it (0 changes; we throw and leave a stranded user row). Same
// race shape as the better-sqlite3 `db.transaction()` path in auth.ts and
// acceptable for a single-shot admin-issued code.
export async function redeemInviteD1(
  plaintext: string,
  username: string,
  email: string,
  password: string
): Promise<User> {
  const db = await getTokenusageD1();
  const inv = await findInviteRowD1(db, plaintext);
  if (!inv) throw new Error("invite not found");
  if (inv.usedAt != null) throw new Error("invite already used");
  if (inv.expiresAt < Date.now()) throw new Error("invite expired");

  const now = Date.now();
  // Inside D1's batch transaction, last_insert_rowid() picks up the row id
  // produced by the preceding INSERT — saves a round trip and keeps the
  // used_by_user_id link consistent with the new user row.
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO users (username, email, password_hash, is_admin, created_at, activated_at)
         VALUES (?, ?, ?, 0, ?, ?)`
      )
      .bind(username, email, hashPassword(password), now, now),
    db
      .prepare(
        `UPDATE invite_tokens
         SET used_at = ?, used_by_user_id = last_insert_rowid()
         WHERE id = ? AND used_at IS NULL`
      )
      .bind(now, inv.id),
  ]);
  const insertMeta = results[0]?.meta as { last_row_id?: number } | undefined;
  const updateMeta = results[1]?.meta as { changes?: number } | undefined;
  if ((updateMeta?.changes ?? 0) !== 1) {
    throw new Error("invite redemption raced");
  }
  return {
    id: Number(insertMeta?.last_row_id ?? 0),
    username,
    email,
    isAdmin: false,
    activatedAt: now,
  };
}

// ---- password reset (D1 mirrors) ----

export type PasswordResetLookupD1 =
  | { ok: true; userId: number; flaggedAt: number }
  | { ok: false; reason: "no-user" | "not-flagged" };

export async function lookupPasswordResetD1(
  email: string
): Promise<PasswordResetLookupD1> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(
      `SELECT id, password_reset_at AS resetAt
       FROM users WHERE email = ? LIMIT 1`
    )
    .bind(email)
    .first<{ id: number; resetAt: number | null }>();
  if (!row) return { ok: false, reason: "no-user" };
  if (row.resetAt == null) return { ok: false, reason: "not-flagged" };
  return { ok: true, userId: row.id, flaggedAt: row.resetAt };
}

// Re-checks the reset flag, swaps the hash, clears the flag, and kills every
// existing session for the user — all in one D1 batch so a partial state
// (new hash without session purge, or vice versa) can't survive a failure.
export async function completePasswordResetD1(
  email: string,
  newPassword: string
): Promise<boolean> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(
      `SELECT id, password_reset_at AS resetAt
       FROM users WHERE email = ? LIMIT 1`
    )
    .bind(email)
    .first<{ id: number; resetAt: number | null }>();
  if (!row || row.resetAt == null) return false;
  await db.batch([
    db
      .prepare(
        `UPDATE users SET password_hash = ?, password_reset_at = NULL
         WHERE id = ? AND password_reset_at IS NOT NULL`
      )
      .bind(hashPassword(newPassword), row.id),
    db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).bind(row.id),
  ]);
  return true;
}

// OAuth bootstrap: create a pending (activated_at NULL, unusable password)
// user row. The username-collision retry mirrors the sqlite path — but
// without a server-side `for` loop pre-checking, we'd race against another
// signup. We pre-check via SELECT here; the UNIQUE index is the final
// safety net (it'll surface as a thrown error to the OAuth callback).
export async function createPendingOauthUserD1(input: {
  email: string;
  preferredUsername?: string | null;
}): Promise<User> {
  const db = await getTokenusageD1();
  const now = Date.now();
  const seed =
    ((input.preferredUsername || input.email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32)) || "user";
  let username = seed;
  for (let i = 1; i < 1000; i++) {
    const taken = await db
      .prepare(`SELECT 1 AS hit FROM users WHERE username = ? LIMIT 1`)
      .bind(username)
      .first<{ hit: number }>();
    if (!taken) break;
    username = `${seed}${i}`;
  }
  // Unusable placeholder: random 32-byte hex hashed via scrypt. The user can
  // never reproduce the plaintext, so password login is blocked until an
  // admin flips the reset flag.
  const placeholder = hashPassword(crypto.randomBytes(32).toString("hex"));
  const result = await db
    .prepare(
      `INSERT INTO users (username, email, password_hash, is_admin, created_at, activated_at)
       VALUES (?, ?, ?, 0, ?, NULL)`
    )
    .bind(username, input.email, placeholder, now)
    .run();
  const meta = result.meta as { last_row_id?: number } | undefined;
  return {
    id: Number(meta?.last_row_id ?? 0),
    username,
    email: input.email,
    isAdmin: false,
    activatedAt: null,
  };
}
