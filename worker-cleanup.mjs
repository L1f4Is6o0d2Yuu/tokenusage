// Cron-driven cleanup of expired share rows. Invoked from
// worker-entry.mjs#scheduled(). Plain .mjs (no TS) so wrangler bundles
// it directly without going through OpenNext's Next.js compile.
//
// What it does on each tick:
//   1. SELECT slugs of share rows older than RETENTION_DAYS from D1
//   2. DELETE the matching objects from R2 (best-effort; if R2 returns
//      404 on a slug, the lifecycle rule already cleaned it — fine)
//   3. DELETE the D1 rows that we just processed
//
// Why not just `DELETE FROM shares WHERE created_at < ...`? Because
// R2 already has a lifecycle rule for >30-day objects; without the
// co-delete in D1, the rows would point at 404'd objects forever and
// the table would grow unbounded.

// Match the R2 lifecycle rule in ops/r2-lifecycle.json (30 days). Keep
// the two in sync — otherwise R2 deletes an object the day before D1
// notices it and the share link returns 404 while still appearing in
// the user's "my shares" view.
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Process at most this many rows per tick. Cloudflare crons get the
// same CPU budget as a regular request; a batch of 500 R2 deletes +
// 500 D1 deletes comfortably fits in 30s of Paid CPU or even 10ms on
// Free for the typical case where there's nothing to clean.
const MAX_PER_TICK = 500;

export async function runSharesCleanup(db, bucket, now = Date.now()) {
  const start = now;
  const cutoff = now - RETENTION_MS;

  const result = await db
    .prepare(
      `SELECT slug FROM shares
       WHERE created_at < ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .bind(cutoff, MAX_PER_TICK)
    .all();
  const rows = result.results ?? [];

  let r2Deleted = 0;
  let r2Missing = 0;
  let r2Failed = 0;
  const deletedSlugs = [];

  for (const { slug } of rows) {
    try {
      const head = await bucket.get(`${slug}.png`);
      if (head) {
        await bucket.delete(`${slug}.png`);
        r2Deleted += 1;
      } else {
        // R2 lifecycle already cleared this one — log so we know.
        r2Missing += 1;
      }
      deletedSlugs.push(slug);
    } catch (e) {
      r2Failed += 1;
      console.error(`[cleanup] R2 delete failed for ${slug}:`, e);
      // Skip the D1 delete for this slug so we retry on the next tick
      // instead of orphaning a still-live R2 object.
    }
  }

  let d1Deleted = 0;
  if (deletedSlugs.length > 0) {
    const placeholders = deletedSlugs.map(() => "?").join(",");
    const del = await db
      .prepare(`DELETE FROM shares WHERE slug IN (${placeholders})`)
      .bind(...deletedSlugs)
      .run();
    d1Deleted = del.meta?.changes ?? deletedSlugs.length;
  }

  const report = {
    scanned: rows.length,
    r2Deleted,
    r2Missing,
    r2Failed,
    d1Deleted,
    durationMs: Date.now() - start,
  };
  console.log("[cleanup] shares cron run:", JSON.stringify(report));
  return report;
}
