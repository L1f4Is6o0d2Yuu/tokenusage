import "server-only";
import { getTokenusageD1 } from "./cloudflare-bindings";
import type { AuditAction, AuditRow } from "./audit";

// D1 mirror of recordAudit / readRecentAudit. The schema matches the
// sqlite migration: audit_log(id, user_id, action, ip, user_agent, meta, ts).
// recordAudit() in audit.ts calls this on the CF runtime so admin-only
// pages like /users/[id]/log work the same way they do on docker prod.

export async function recordAuditD1(params: {
  userId: number | null;
  action: AuditAction;
  ip: string | null;
  userAgent: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(
      `INSERT INTO audit_log (user_id, action, ip, user_agent, meta, ts)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.userId,
      params.action,
      params.ip || null,
      params.userAgent ? params.userAgent.slice(0, 255) : null,
      params.meta ? JSON.stringify(params.meta) : null,
      Date.now()
    )
    .run();
}

export async function readRecentAuditD1(
  limit = 100,
  userId?: number
): Promise<AuditRow[]> {
  const db = await getTokenusageD1();
  if (userId != null) {
    const r = await db
      .prepare(
        `SELECT id, user_id, action, ip, user_agent, meta, ts
         FROM audit_log WHERE user_id = ?
         ORDER BY ts DESC LIMIT ?`
      )
      .bind(userId, limit)
      .all<AuditRow>();
    return r.results ?? [];
  }
  const r = await db
    .prepare(
      `SELECT id, user_id, action, ip, user_agent, meta, ts
       FROM audit_log
       ORDER BY ts DESC LIMIT ?`
    )
    .bind(limit)
    .all<AuditRow>();
  return r.results ?? [];
}
