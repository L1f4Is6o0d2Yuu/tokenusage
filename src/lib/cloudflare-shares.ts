import "server-only";
import crypto from "node:crypto";
import { getTokenusageD1, getTokenusageR2 } from "./cloudflare-bindings";
import type { SavedShare } from "./shares";

const ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function newSlug(): string {
  const bytes = crypto.randomBytes(12);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += ALPHA[bytes[i] % ALPHA.length];
  return s;
}

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

export function shareObjectKey(slug: string): string {
  return `shares/${slug}.png`;
}

export async function createShareD1R2(input: {
  userId: number;
  period: string;
  pngBytes: ArrayBuffer;
  apiValueUsd?: number;
  multiplier?: string;
  taunt?: string;
}): Promise<SavedShare> {
  const db = await getTokenusageD1();
  const bucket = await getTokenusageR2();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    const exists = await db.prepare("SELECT 1 FROM shares WHERE slug = ?").bind(slug).first();
    if (exists) continue;
    await bucket.put(shareObjectKey(slug), input.pngBytes, {
      httpMetadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=86400, immutable",
      },
    });
    const now = Date.now();
    const info = await db
      .prepare(
        `INSERT INTO shares
         (slug, user_id, period, api_value_usd, multiplier, taunt, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        slug,
        input.userId,
        input.period,
        input.apiValueUsd ?? null,
        input.multiplier ?? null,
        input.taunt ?? null,
        now
      )
      .run();
    return {
      id: Number(info.meta?.last_row_id ?? 0),
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

export async function getShareBySlugD1(slug: string): Promise<SavedShare | null> {
  const db = await getTokenusageD1();
  const row = await db.prepare("SELECT * FROM shares WHERE slug = ?").bind(slug).first<Record<string, unknown>>();
  if (!row) return null;
  return rowToShare(row);
}

export async function getSharePngR2(slug: string): Promise<ArrayBuffer | null> {
  const bucket = await getTokenusageR2();
  const object = await bucket.get(shareObjectKey(slug));
  if (!object) return null;
  return object.arrayBuffer();
}

export async function revokeShareD1R2(slug: string, userId: number): Promise<boolean> {
  const db = await getTokenusageD1();
  const share = await getShareBySlugD1(slug);
  if (!share || share.userId !== userId) return false;
  if (share.revokedAt != null) return true;
  const bucket = await getTokenusageR2();
  await bucket.delete(shareObjectKey(slug));
  await db.prepare("UPDATE shares SET revoked_at = ? WHERE slug = ?").bind(Date.now(), slug).run();
  return true;
}
