import "server-only";
import { openServerDb } from "./server-db";

const VALID_INTERVALS = new Set([60, 300, 600, 1800, 3600, 86400]);

export type UserSyncState = {
  syncIntervalSeconds: number;
  syncRequestedAt: number | null;
  lastUploadedAt: number | null;
  paused: boolean;
};

export function getUserSyncState(userId: number): UserSyncState {
  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT sync_interval_seconds AS s, sync_requested_at AS r,
                last_uploaded_at AS u, agent_paused AS p
         FROM users WHERE id = ?`
      )
      .get(userId) as
      | { s: number | null; r: number | null; u: number | null; p: number | null }
      | undefined;
    return {
      syncIntervalSeconds: row?.s ?? 300,
      syncRequestedAt: row?.r ?? null,
      lastUploadedAt: row?.u ?? null,
      paused: (row?.p ?? 0) === 1,
    };
  } finally {
    db.close();
  }
}

export function setAgentPaused(userId: number, paused: boolean): void {
  const db = openServerDb();
  try {
    db.prepare(`UPDATE users SET agent_paused = ? WHERE id = ?`).run(
      paused ? 1 : 0,
      userId
    );
  } finally {
    db.close();
  }
}

export function requestSync(userId: number): void {
  const db = openServerDb();
  try {
    db.prepare(`UPDATE users SET sync_requested_at = ? WHERE id = ?`).run(
      Date.now(),
      userId
    );
  } finally {
    db.close();
  }
}

export function setSyncInterval(userId: number, seconds: number): void {
  if (!VALID_INTERVALS.has(seconds)) {
    throw new Error(`invalid sync interval: ${seconds}`);
  }
  const db = openServerDb();
  try {
    db.prepare(
      `UPDATE users SET sync_interval_seconds = ? WHERE id = ?`
    ).run(seconds, userId);
  } finally {
    db.close();
  }
}

export function markUploaded(userId: number): void {
  const db = openServerDb();
  try {
    db.prepare(`UPDATE users SET last_uploaded_at = ? WHERE id = ?`).run(
      Date.now(),
      userId
    );
  } finally {
    db.close();
  }
}

export function getLatestAgentSeenAt(userId: number): number | null {
  const db = openServerDb();
  try {
    const row = db
      .prepare(
        `SELECT MAX(last_used_at) AS t FROM api_tokens WHERE user_id = ?`
      )
      .get(userId) as { t: number | null } | undefined;
    return row?.t ?? null;
  } finally {
    db.close();
  }
}
