-- D1 staging schema for the Cloudflare migration.
-- Mirrors the current post-migration better-sqlite3 schema in src/lib/server-db.ts.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  email TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  sync_interval_seconds INTEGER NOT NULL DEFAULT 300,
  sync_requested_at INTEGER,
  last_uploaded_at INTEGER,
  agent_paused INTEGER NOT NULL DEFAULT 0,
  password_reset_at INTEGER,
  last_ip TEXT,
  last_ip_at INTEGER,
  subscriptions_setup_at INTEGER,
  agent_version TEXT,
  show_on_leaderboard INTEGER NOT NULL DEFAULT 1,
  upload_started_at INTEGER,
  upload_total_bytes INTEGER,
  activated_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(email) WHERE email IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_sessions_user_started
  ON sessions_data(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS invite_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  code TEXT
);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_creator ON invite_tokens(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_code_unique
  ON invite_tokens(code) WHERE code IS NOT NULL;

CREATE TABLE IF NOT EXISTS ip_lookups (
  ip TEXT PRIMARY KEY,
  country TEXT,
  region TEXT,
  city TEXT,
  looked_up_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  UNIQUE(user_id, plan)
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
  ON user_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  api_value_usd REAL,
  multiplier TEXT,
  taunt TEXT,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_shares_user
  ON shares(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  meta TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_ts
  ON audit_log(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_ts
  ON audit_log(action, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts
  ON audit_log(ts DESC);
