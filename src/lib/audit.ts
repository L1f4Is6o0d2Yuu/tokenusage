import "server-only";
import { openServerDb } from "./server-db";

// Security-relevant actions we record to the audit_log table. Keep this
// list tight — every entry expands the surface that ops/forensics has to
// reason about. Add a new value only when there's a concrete need to
// answer "who did X, from where, when".
export type AuditAction =
  | "login"
  | "login_failed"
  | "signup"
  | "invite_redeemed"
  | "password_reset"
  | "upload"
  | "ingest";

export function recordAudit(params: {
  userId: number | null;
  action: AuditAction;
  ip: string | null;
  userAgent: string | null;
  meta?: Record<string, unknown>;
}): void {
  // Audit log failures must never bubble back to the caller — a broken
  // logger should not break a successful upload or login.
  try {
    const db = openServerDb();
    try {
      db.prepare(
        `INSERT INTO audit_log (user_id, action, ip, user_agent, meta, ts)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        params.userId,
        params.action,
        params.ip || null,
        params.userAgent ? params.userAgent.slice(0, 255) : null,
        params.meta ? JSON.stringify(params.meta) : null,
        Date.now()
      );
    } finally {
      db.close();
    }
  } catch (e) {
    console.error("[audit] failed to record:", e);
  }
}

export type AuditRow = {
  id: number;
  user_id: number | null;
  action: AuditAction;
  ip: string | null;
  user_agent: string | null;
  meta: string | null;
  ts: number;
};

export function readRecentAudit(limit = 100, userId?: number): AuditRow[] {
  const db = openServerDb();
  try {
    if (userId != null) {
      return db
        .prepare(
          `SELECT id, user_id, action, ip, user_agent, meta, ts
           FROM audit_log WHERE user_id = ?
           ORDER BY ts DESC LIMIT ?`
        )
        .all(userId, limit) as AuditRow[];
    }
    return db
      .prepare(
        `SELECT id, user_id, action, ip, user_agent, meta, ts
         FROM audit_log
         ORDER BY ts DESC LIMIT ?`
      )
      .all(limit) as AuditRow[];
  } finally {
    db.close();
  }
}
