import "server-only";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { openServerDb } from "./server-db";

// File-on-disk storage for saved share posters. The DB row carries
// metadata + the slug; the actual PNG sits at /data/shares/<slug>.png
// (Docker volume, survives container rebuilds, easy to back up by
// rsync'ing the directory).
//
// Slug shape: 12 base62 chars (~71 bits) → impossible to enumerate
// without the URL even if someone scrapes the index. Public-by-link.

const ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function newSlug(): string {
  const bytes = crypto.randomBytes(12);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += ALPHA[bytes[i] % ALPHA.length];
  return s;
}

function shareDir(): string {
  const base = process.env.TOKENUSAGE_SHARE_DIR ?? "/data/shares";
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

export function shareFilePath(slug: string): string {
  return path.join(shareDir(), `${slug}.png`);
}

export type SavedShare = {
  id: number;
  slug: string;
  userId: number;
  period: string;
  apiValueUsd: number | null;
  multiplier: string | null;
  taunt: string | null;
  createdAt: number;
  revokedAt: number | null;
};

function rowToShare(r: Record<string, unknown>): SavedShare {
  return {
    id: r.id as number,
    slug: r.slug as string,
    userId: r.user_id as number,
    period: r.period as string,
    apiValueUsd: (r.api_value_usd as number | null) ?? null,
    multiplier: (r.multiplier as string | null) ?? null,
    taunt: (r.taunt as string | null) ?? null,
    createdAt: r.created_at as number,
    revokedAt: (r.revoked_at as number | null) ?? null,
  };
}

export function createShare(input: {
  userId: number;
  period: string;
  pngBytes: Buffer;
  apiValueUsd?: number;
  multiplier?: string;
  taunt?: string;
}): SavedShare {
  const db = openServerDb();
  // Slug-collision guard — 12 base62 chars makes collisions astronomically
  // unlikely, but cheap to defend anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    const exists = db
      .prepare("SELECT 1 FROM shares WHERE slug = ?")
      .get(slug);
    if (exists) continue;
    fs.writeFileSync(shareFilePath(slug), input.pngBytes);
    const now = Date.now();
    const info = db
      .prepare(
        `INSERT INTO shares
         (slug, user_id, period, api_value_usd, multiplier, taunt, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        slug,
        input.userId,
        input.period,
        input.apiValueUsd ?? null,
        input.multiplier ?? null,
        input.taunt ?? null,
        now
      );
    return {
      id: Number(info.lastInsertRowid),
      slug,
      userId: input.userId,
      period: input.period,
      apiValueUsd: input.apiValueUsd ?? null,
      multiplier: input.multiplier ?? null,
      taunt: input.taunt ?? null,
      createdAt: now,
      revokedAt: null,
    };
  }
  throw new Error("share: slug allocation failed (5 collisions in a row?)");
}

export function getShareBySlug(slug: string): SavedShare | null {
  const db = openServerDb();
  const row = db
    .prepare("SELECT * FROM shares WHERE slug = ?")
    .get(slug) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToShare(row);
}

export function listUserShares(userId: number, limit = 50): SavedShare[] {
  const db = openServerDb();
  const rows = db
    .prepare(
      `SELECT * FROM shares WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as Record<string, unknown>[];
  return rows.map(rowToShare);
}

// Revoke deletes the PNG and marks the row — /s/<slug> 404s after.
// We keep the row (rather than DELETE) so analytics + abuse audits
// retain a paper trail without re-using a slug.
export function revokeShare(slug: string, userId: number): boolean {
  const db = openServerDb();
  const share = getShareBySlug(slug);
  if (!share || share.userId !== userId) return false;
  if (share.revokedAt != null) return true; // idempotent
  try {
    fs.unlinkSync(shareFilePath(slug));
  } catch {
    // file may already be gone — proceed anyway
  }
  db.prepare("UPDATE shares SET revoked_at = ? WHERE slug = ?").run(
    Date.now(),
    slug
  );
  return true;
}
