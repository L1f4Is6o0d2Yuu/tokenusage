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
  `);
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
