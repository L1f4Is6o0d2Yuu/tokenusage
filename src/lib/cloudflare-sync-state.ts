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

export async function recordAgentVersionD1(
  userId: number,
  version: string
): Promise<void> {
  if (!version || version.length > 32) return;
  const db = await getTokenusageD1();
  await db
    .prepare(`UPDATE users SET agent_version = ? WHERE id = ?`)
    .bind(version, userId)
    .run();
}
