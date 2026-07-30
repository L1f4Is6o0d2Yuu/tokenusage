import "server-only";
import { getTokenusageD1 } from "./cloudflare-bindings";
import { isAgentLiveAt } from "./agent-health";
import type { UserSyncState } from "./sync-state";

// D1 mirror of `getUserSyncState` from src/lib/sync-state.ts. The SQL
// is the same shape — D1 is sqlite-compatible — but the binding API is
// async and parameterised differently. The return type is shared with
// the Node version so route handlers can be runtime-agnostic above.
export async function getUserSyncStateD1(userId: number): Promise<UserSyncState> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(
      `SELECT u.sync_interval_seconds AS s, u.sync_requested_at AS r,
              u.last_uploaded_at AS u, u.agent_paused AS p,
              u.upload_started_at AS us, u.upload_total_bytes AS ub,
              u.agent_version AS av,
              (SELECT MAX(t.last_used_at) FROM api_tokens t WHERE t.user_id = u.id) AS ase
       FROM users u WHERE u.id = ?`
    )
    .bind(userId)
    .first<{
      s: number | null;
      r: number | null;
      u: number | null;
      p: number | null;
      us: number | null;
      ub: number | null;
      av: string | null;
      ase: number | null;
    }>();
  const agentSeenAt = row?.ase ?? null;
  return {
    syncIntervalSeconds: row?.s ?? 300,
    syncRequestedAt: row?.r ?? null,
    lastUploadedAt: row?.u ?? null,
    paused: (row?.p ?? 0) === 1,
    agentSeenAt,
    agentLive: isAgentLiveAt(agentSeenAt, Date.now()),
    agentVersion: row?.av ?? null,
    uploadStartedAt: row?.us ?? null,
    uploadTotalBytes: row?.ub ?? null,
  };
}

export async function recordUploadStartingD1(
  userId: number,
  totalBytes: number
): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(
      `UPDATE users SET upload_started_at = ?, upload_total_bytes = ? WHERE id = ?`
    )
    .bind(Date.now(), totalBytes, userId)
    .run();
}

export async function clearUploadInProgressD1(userId: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(
      `UPDATE users SET upload_started_at = NULL, upload_total_bytes = NULL WHERE id = ?`
    )
    .bind(userId)
    .run();
}

// Read-before-write, same rationale as the Node twin in src/lib/auth.ts:
// the agent reports its version on every request but it changes about
// once a month, and D1 row-writes are the scarce resource (100k/day free)
// while reads are not (5M/day).
export async function recordAgentVersionD1(
  userId: number,
  version: string
): Promise<void> {
  if (!version || version.length > 32) return;
  const db = await getTokenusageD1();
  const row = await db
    .prepare(`SELECT agent_version AS v FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ v: string | null }>();
  if (row?.v === version) return;
  await db
    .prepare(`UPDATE users SET agent_version = ? WHERE id = ?`)
    .bind(version, userId)
    .run();
}

export async function getLatestAgentSeenAtD1(userId: number): Promise<number | null> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(`SELECT MAX(last_used_at) AS t FROM api_tokens WHERE user_id = ?`)
    .bind(userId)
    .first<{ t: number | null }>();
  return row?.t ?? null;
}

export async function setAgentPausedD1(userId: number, paused: boolean): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET agent_paused = ? WHERE id = ?`)
    .bind(paused ? 1 : 0, userId)
    .run();
}

export async function requestSyncD1(userId: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET sync_requested_at = ? WHERE id = ?`)
    .bind(Date.now(), userId)
    .run();
}

const VALID_INTERVALS = new Set([60, 300, 600, 1800, 3600, 86400]);

export async function setSyncIntervalD1(userId: number, seconds: number): Promise<void> {
  if (!VALID_INTERVALS.has(seconds)) {
    throw new Error(`invalid sync interval: ${seconds}`);
  }
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET sync_interval_seconds = ? WHERE id = ?`)
    .bind(seconds, userId)
    .run();
}

export async function markUploadedD1(userId: number): Promise<void> {
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET last_uploaded_at = ? WHERE id = ?`)
    .bind(Date.now(), userId)
    .run();
}
