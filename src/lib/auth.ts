import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { openServerDb } from "./server-db";

export const SESSION_COOKIE = "tokenusage-session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export type User = {
  id: number;
  username: string;
  email: string | null;
  isAdmin: boolean;
};

// ---- password hashing (scrypt, built into node:crypto, no native deps) ----

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  const derived = crypto.scryptSync(password, salt, expected.length, {
    N,
    r: 8,
    p: 1,
  });
  return crypto.timingSafeEqual(derived, expected);
}

// ---- session tokens ----

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  const db = openServerDb();
  try {
    const now = Date.now();
    db.prepare(
      `INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(hashToken(token), userId, now, now + SESSION_TTL_MS);
  } finally {
    db.close();
  }
  return token;
}

export function destroySession(token: string): void {
  const db = openServerDb();
  try {
    db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(hashToken(token));
  } finally {
    db.close();
  }
}

export async function readCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT u.id AS id, u.username AS username, u.email AS email,
                u.is_admin AS is_admin, s.expires_at AS expires_at
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(hashToken(token)) as
      | { id: number; username: string; email: string | null; is_admin: number; expires_at: number }
      | undefined;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(hashToken(token));
      return null;
    }
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isAdmin: row.is_admin === 1,
    };
  } finally {
    db.close();
  }
}

// ---- user creation / login ----

export type CreateUserInput = {
  username: string;
  email?: string | null;
  password: string;
  isAdmin?: boolean;
};

export function createUser(input: CreateUserInput): User {
  const db = openServerDb();
  try {
    const info = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, is_admin, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        input.username,
        input.email ?? null,
        hashPassword(input.password),
        input.isAdmin ? 1 : 0,
        Date.now()
      );
    return {
      id: Number(info.lastInsertRowid),
      username: input.username,
      email: input.email ?? null,
      isAdmin: !!input.isAdmin,
    };
  } finally {
    db.close();
  }
}

// Login by either username or email — whichever the user typed in. Passwords
// are still always required.
export function authenticate(identifier: string, password: string): User | null {
  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT id, username, email, is_admin, password_hash
         FROM users WHERE username = ? OR email = ? LIMIT 1`
      )
      .get(identifier, identifier) as
      | {
          id: number;
          username: string;
          email: string | null;
          is_admin: number;
          password_hash: string;
        }
      | undefined;
    if (!row) return null;
    if (!verifyPassword(password, row.password_hash)) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isAdmin: row.is_admin === 1,
    };
  } finally {
    db.close();
  }
}

// ---- invite tokens (admin → invitee one-time signup link) ----

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type InviteRow = {
  id: number;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  note: string | null;
};

// Generates `TU####` — a 6-char invite code with a 2-letter prefix and 4
// random digits. Collision-retry up to 50 times against existing rows.
//
// 10K-code space is tiny by crypto standards but acceptable for an
// admin-issued, one-shot, 14-day-expiry coupon. Each new code is also
// hashed into `token_hash` so the legacy lookup path keeps working for
// callers that only know the hash; the lookup tries `code` first.
//
// The 4-digit format is a deliberate trade for shareability (a user can
// type or read it over a phone call). If we ever need a bigger keyspace
// the column already accepts longer strings.
function generateInviteCode(db: ReturnType<typeof openServerDb>): string {
  const stmt = db.prepare(`SELECT 1 FROM invite_tokens WHERE code = ? LIMIT 1`);
  for (let i = 0; i < 50; i++) {
    const n = crypto.randomInt(0, 10000).toString().padStart(4, "0");
    const code = `TU${n}`;
    if (!stmt.get(code)) return code;
  }
  throw new Error("invite code space exhausted — revoke expired invites and retry");
}

export function createInvite(adminUserId: number, note: string | null): {
  id: number;
  plaintext: string;
} {
  const db = openServerDb();
  try {
    const code = generateInviteCode(db);
    const now = Date.now();
    const info = db
      .prepare(
        `INSERT INTO invite_tokens (token_hash, code, created_by, created_at, expires_at, note)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(hashToken(code), code, adminUserId, now, now + INVITE_TTL_MS, note);
    return { id: Number(info.lastInsertRowid), plaintext: code };
  } finally {
    db.close();
  }
}

export function listInvites(): InviteRow[] {
  const db = openServerDb();
  try {
    return db
      .prepare(
        `SELECT id, created_at AS createdAt, expires_at AS expiresAt,
                used_at AS usedAt, note
         FROM invite_tokens ORDER BY created_at DESC`
      )
      .all() as InviteRow[];
  } finally {
    db.close();
  }
}

export function revokeInvite(id: number): void {
  const db = openServerDb();
  try {
    db.prepare(`DELETE FROM invite_tokens WHERE id = ? AND used_at IS NULL`).run(id);
  } finally {
    db.close();
  }
}

// Look up an invite row by either the new short code or the legacy hashed
// token. New `TU####` codes match `code` directly; old `tui_…` tokens
// resolve via sha256 like before. Either path returns the same row shape.
function findInviteRow(
  db: ReturnType<typeof openServerDb>,
  plaintext: string
): { id: number; expiresAt: number; usedAt: number | null } | undefined {
  const trimmed = plaintext.trim();
  // TU codes are case-insensitive for the user — we store and compare in
  // uppercase. Legacy `tui_` tokens are case-sensitive hex, untouched.
  const codeKey = /^tu\d{4}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
  const byCode = db
    .prepare(
      `SELECT id, expires_at AS expiresAt, used_at AS usedAt
       FROM invite_tokens WHERE code = ? LIMIT 1`
    )
    .get(codeKey) as
    | { id: number; expiresAt: number; usedAt: number | null }
    | undefined;
  if (byCode) return byCode;
  return db
    .prepare(
      `SELECT id, expires_at AS expiresAt, used_at AS usedAt
       FROM invite_tokens WHERE token_hash = ? LIMIT 1`
    )
    .get(hashToken(trimmed)) as
    | { id: number; expiresAt: number; usedAt: number | null }
    | undefined;
}

// Validate a plaintext invite without consuming it. Used by the redemption
// page to decide whether to render the form or an error.
export function lookupInvite(plaintext: string):
  | { ok: true; id: number; expiresAt: number }
  | { ok: false; reason: "not-found" | "expired" | "used" } {
  const db = openServerDb();
  try {
    const row = findInviteRow(db, plaintext);
    if (!row) return { ok: false, reason: "not-found" };
    if (row.usedAt != null) return { ok: false, reason: "used" };
    if (row.expiresAt < Date.now()) return { ok: false, reason: "expired" };
    return { ok: true, id: row.id, expiresAt: row.expiresAt };
  } finally {
    db.close();
  }
}

// Atomic redemption: validate + create user + mark invite used in one txn.
// Throws on conflict (duplicate username/email or invalid token).
export function redeemInvite(
  plaintext: string,
  username: string,
  email: string,
  password: string
): User {
  const db = openServerDb();
  try {
    const txn = db.transaction(() => {
      const inv = findInviteRow(db, plaintext);
      if (!inv) throw new Error("invite not found");
      if (inv.usedAt != null) throw new Error("invite already used");
      if (inv.expiresAt < Date.now()) throw new Error("invite expired");

      const info = db
        .prepare(
          `INSERT INTO users (username, email, password_hash, is_admin, created_at)
           VALUES (?, ?, ?, 0, ?)`
        )
        .run(username, email, hashPassword(password), Date.now());
      const userId = Number(info.lastInsertRowid);
      db.prepare(
        `UPDATE invite_tokens SET used_at = ?, used_by_user_id = ? WHERE id = ?`
      ).run(Date.now(), userId, inv.id);
      return { id: userId, username, email, isAdmin: false };
    });
    return txn();
  } finally {
    db.close();
  }
}

export function listUsers(): Array<{
  id: number;
  username: string;
  email: string | null;
  isAdmin: boolean;
  createdAt: number;
  passwordResetAt: number | null;
}> {
  const db = openServerDb();
  try {
    return db
      .prepare(
        `SELECT id, username, email, is_admin AS isAdmin, created_at AS createdAt,
                password_reset_at AS passwordResetAt
         FROM users ORDER BY created_at ASC`
      )
      .all()
      .map((r) => {
        const row = r as {
          id: number;
          username: string;
          email: string | null;
          isAdmin: number;
          createdAt: number;
          passwordResetAt: number | null;
        };
        return { ...row, isAdmin: row.isAdmin === 1 };
      });
  } finally {
    db.close();
  }
}

// ---- API tokens (for agents) ----

export type ApiTokenRow = {
  id: number;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
};

export function listTokens(userId: number): ApiTokenRow[] {
  const db = openServerDb();
  try {
    return db
      .prepare(
        `SELECT id, name, created_at AS createdAt, last_used_at AS lastUsedAt
         FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(userId) as ApiTokenRow[];
  } finally {
    db.close();
  }
}

export function createApiToken(userId: number, name: string): {
  id: number;
  plaintext: string;
} {
  const plaintext = "tu_" + crypto.randomBytes(24).toString("hex");
  const db = openServerDb();
  try {
    const info = db
      .prepare(
        `INSERT INTO api_tokens (user_id, name, token_hash, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(userId, name, hashToken(plaintext), Date.now());
    return { id: Number(info.lastInsertRowid), plaintext };
  } finally {
    db.close();
  }
}

export function revokeApiToken(userId: number, id: number): void {
  const db = openServerDb();
  try {
    db.prepare(`DELETE FROM api_tokens WHERE id = ? AND user_id = ?`).run(id, userId);
  } finally {
    db.close();
  }
}

export function authenticateApiToken(plaintext: string): User | null {
  if (!plaintext.startsWith("tu_")) return null;
  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT u.id AS id, u.username AS username, u.email AS email,
                u.is_admin AS is_admin, t.id AS token_id
         FROM api_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ?`
      )
      .get(hashToken(plaintext)) as
      | { id: number; username: string; email: string | null; is_admin: number; token_id: number }
      | undefined;
    if (!row) return null;
    db.prepare(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`).run(
      Date.now(),
      row.token_id
    );
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isAdmin: row.is_admin === 1,
    };
  } finally {
    db.close();
  }
}

// ---- admin-gated password reset (v0.17) ----
//
// Two-step flow: admin sets `password_reset_at` on a user → that user can
// then walk through /forgot-password to set a new password. Without the flag
// the reset page refuses, telling the user to ask the admin. We deliberately
// avoid a self-service email-link flow because the server has no mail path.

// Admin flips the flag. We don't invalidate the user's current sessions —
// they can still log in with their old password until they reset. (The
// flag is permission to reset, not a forced logout.)
export function flagPasswordReset(userId: number): void {
  const db = openServerDb();
  try {
    db.prepare(`UPDATE users SET password_reset_at = ? WHERE id = ?`).run(
      Date.now(),
      userId
    );
  } finally {
    db.close();
  }
}

export type PasswordResetLookup =
  | { ok: true; userId: number; flaggedAt: number }
  // "no-user" is *not* surfaced to the UI distinctly from "not-flagged" —
  // both render the same "ask the admin" message — but we keep them
  // separate at the data layer so server-side logs can tell them apart.
  | { ok: false; reason: "no-user" | "not-flagged" };

export function lookupPasswordReset(email: string): PasswordResetLookup {
  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT id, password_reset_at AS resetAt
         FROM users WHERE email = ? LIMIT 1`
      )
      .get(email) as { id: number; resetAt: number | null } | undefined;
    if (!row) return { ok: false, reason: "no-user" };
    if (row.resetAt == null) return { ok: false, reason: "not-flagged" };
    return { ok: true, userId: row.id, flaggedAt: row.resetAt };
  } finally {
    db.close();
  }
}

// Atomic: re-check the flag is set, swap the hash, clear the flag, kill all
// existing sessions. The session purge keeps an attacker who took over the
// account temporarily from lingering after the legit owner resets.
export function completePasswordReset(email: string, newPassword: string): boolean {
  const db = openServerDb();
  try {
    const txn = db.transaction(() => {
      const row = db
        .prepare(
          `SELECT id, password_reset_at AS resetAt
           FROM users WHERE email = ? LIMIT 1`
        )
        .get(email) as { id: number; resetAt: number | null } | undefined;
      if (!row || row.resetAt == null) return false;
      db.prepare(
        `UPDATE users SET password_hash = ?, password_reset_at = NULL WHERE id = ?`
      ).run(hashPassword(newPassword), row.id);
      db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(row.id);
      return true;
    });
    return txn();
  } finally {
    db.close();
  }
}
