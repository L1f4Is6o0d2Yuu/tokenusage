import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const DEFAULT_PATH = path.join(process.cwd(), "data", "server.db");

export function serverDbPath(): string {
  return process.env.TOKENUSAGE_SERVER_DB || DEFAULT_PATH;
}

// True iff the server-mode DB exists and has at least one user. We use this to
// decide whether the dashboard runs in single-user (read local files directly)
// or multi-user (auth required, data comes from agents) mode.
export function isMultiUserMode(): boolean {
  const p = serverDbPath();
  if (!fs.existsSync(p)) return false;
  try {
    const db = new Database(p, { readonly: true, fileMustExist: true });
    try {
      const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
      return row.n > 0;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

let migrated = false;

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

    CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);

    CREATE TABLE IF NOT EXISTS sessions_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      external_id TEXT NOT NULL,
      source TEXT,
      model TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL,
      cost_status TEXT,
      api_call_count INTEGER NOT NULL DEFAULT 0,
      title TEXT,
      ingested_at INTEGER NOT NULL,
      UNIQUE(user_id, provider, external_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions_data(user_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS invite_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_invite_tokens_creator ON invite_tokens(created_by);
  `);

  // v0.9 migration: add email column to existing users tables.
  if (!hasColumn(db, "users", "email")) {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
         ON users(email) WHERE email IS NOT NULL`
    );
  }
  // v0.9: tag the first admin so we can show admin-only UI later.
  if (!hasColumn(db, "users", "is_admin")) {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`);
    // Existing first user becomes admin retroactively.
    db.exec(
      `UPDATE users SET is_admin = 1 WHERE id = (SELECT MIN(id) FROM users)`
    );
  }

  // v0.11: per-user sync settings + observability columns.
  if (!hasColumn(db, "users", "sync_interval_seconds")) {
    db.exec(
      `ALTER TABLE users ADD COLUMN sync_interval_seconds INTEGER NOT NULL DEFAULT 300`
    );
  }
  if (!hasColumn(db, "users", "sync_requested_at")) {
    db.exec(`ALTER TABLE users ADD COLUMN sync_requested_at INTEGER`);
  }
  if (!hasColumn(db, "users", "last_uploaded_at")) {
    db.exec(`ALTER TABLE users ADD COLUMN last_uploaded_at INTEGER`);
  }

  // v0.12: pause/resume tracking from the dashboard.
  if (!hasColumn(db, "users", "agent_paused")) {
    db.exec(
      `ALTER TABLE users ADD COLUMN agent_paused INTEGER NOT NULL DEFAULT 0`
    );
  }

  // v0.17: admin-gated password reset. Admin flips the flag; the user can
  // then set a new password via /forgot-password. Without the flag set,
  // /forgot-password tells the user to ask the admin — we deliberately
  // don't send recovery email because the server isn't wired for SMTP.
  if (!hasColumn(db, "users", "password_reset_at")) {
    db.exec(`ALTER TABLE users ADD COLUMN password_reset_at INTEGER`);
  }

  // v0.17: short human-friendly invite codes (TU####). The legacy
  // `token_hash` column stays — old `tui_…` invites keep working — but
  // new invites populate `code` with a 6-char string the user can type.
  // Partial unique index so old rows with NULL code don't conflict.
  if (!hasColumn(db, "invite_tokens", "code")) {
    db.exec(`ALTER TABLE invite_tokens ADD COLUMN code TEXT`);
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_code_unique
         ON invite_tokens(code) WHERE code IS NOT NULL`
    );
  }

  // v0.17: last-known IP per user, plus a separate ip_lookups cache for
  // geolocation. We store country/region/city alongside the IP it
  // belongs to and TTL the row (30 days) — ip-api.com is rate-limited
  // and most users don't change locations from one login to the next.
  if (!hasColumn(db, "users", "last_ip")) {
    db.exec(`ALTER TABLE users ADD COLUMN last_ip TEXT`);
  }
  if (!hasColumn(db, "users", "last_ip_at")) {
    db.exec(`ALTER TABLE users ADD COLUMN last_ip_at INTEGER`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_lookups (
      ip TEXT PRIMARY KEY,
      country TEXT,
      region TEXT,
      city TEXT,
      looked_up_at INTEGER NOT NULL
    );
  `);

  // v0.18: subscriptions the user has self-declared, used to compute
  // "did your usage pay back the subscription this period?". One row
  // per active plan per user; `plan` references the catalog in
  // lib/subscriptions.ts. We don't try to fetch real billing data —
  // the user toggles which plans they pay for and we trust them.
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      UNIQUE(user_id, plan)
    );
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
  `);

  // v0.18: marker so we can force the arsenal-picking screen on first
  // dashboard visit and never again. Set by `saveSubscriptionsAction`
  // regardless of whether the form submitted any plans, so users who
  // "skip" don't get re-prompted.
  if (!hasColumn(db, "users", "subscriptions_setup_at")) {
    db.exec(`ALTER TABLE users ADD COLUMN subscriptions_setup_at INTEGER`);
  }

  // v0.18: agent version self-report on heartbeat / upload. Drives the
  // sidebar's "update available" red dot when an agent reports a
  // version older than LATEST_AGENT_VERSION.
  if (!hasColumn(db, "users", "agent_version")) {
    db.exec(`ALTER TABLE users ADD COLUMN agent_version TEXT`);
  }
}

export function openServerDb(): Database.Database {
  const p = serverDbPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(p);
  if (!migrated) {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    migrated = true;
  } else {
    db.pragma("foreign_keys = ON");
  }
  return db;
}

// True iff users table exists AND is empty — first-run signup flow.
export function isFirstRun(): boolean {
  const p = serverDbPath();
  if (!fs.existsSync(p)) return true;
  try {
    const db = openServerDb();
    try {
      const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
      return row.n === 0;
    } finally {
      db.close();
    }
  } catch {
    return true;
  }
}
