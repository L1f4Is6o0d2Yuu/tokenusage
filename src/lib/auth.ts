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
        `SELECT u.id AS id, u.username AS username, s.expires_at AS expires_at
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(hashToken(token)) as
      | { id: number; username: string; expires_at: number }
      | undefined;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(hashToken(token));
      return null;
    }
    return { id: row.id, username: row.username };
  } finally {
    db.close();
  }
}

// ---- user creation / login ----

export function createUser(username: string, password: string): User {
  const db = openServerDb();
  try {
    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)`
      )
      .run(username, hashPassword(password), Date.now());
    return { id: Number(info.lastInsertRowid), username };
  } finally {
    db.close();
  }
}

export function authenticate(username: string, password: string): User | null {
  const db = openServerDb();
  try {
    const row = db
      .prepare(`SELECT id, username, password_hash FROM users WHERE username = ?`)
      .get(username) as
      | { id: number; username: string; password_hash: string }
      | undefined;
    if (!row) return null;
    if (!verifyPassword(password, row.password_hash)) return null;
    return { id: row.id, username: row.username };
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
        `SELECT u.id AS id, u.username AS username, t.id AS token_id
         FROM api_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ?`
      )
      .get(hashToken(plaintext)) as
      | { id: number; username: string; token_id: number }
      | undefined;
    if (!row) return null;
    db.prepare(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`).run(
      Date.now(),
      row.token_id
    );
    return { id: row.id, username: row.username };
  } finally {
    db.close();
  }
}
