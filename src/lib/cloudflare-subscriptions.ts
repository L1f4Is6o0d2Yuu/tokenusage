import "server-only";
import { getTokenusageD1 } from "./cloudflare-bindings";
import { PLAN_BY_ID, type PlanId } from "./subscriptions";

// D1 mirror of the four DB-touching functions in src/lib/subscriptions.ts.
// PLAN_CATALOG and the PlanDef types stay in the Node module — they're
// pure data, no DB. We just re-export PLAN_BY_ID for the validation
// gate so this file doesn't duplicate the catalog.

export async function hasFinishedSubscriptionsSetupD1(userId: number): Promise<boolean> {
  const db = await getTokenusageD1();
  const row = await db
    .prepare(`SELECT subscriptions_setup_at AS t FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ t: number | null }>();
  return row?.t != null;
}

export async function listUserSubscriptionsD1(userId: number): Promise<PlanId[]> {
  const db = await getTokenusageD1();
  const result = await db
    .prepare(
      `SELECT plan FROM user_subscriptions
       WHERE user_id = ? ORDER BY started_at ASC`
    )
    .bind(userId)
    .all<{ plan: string }>();
  const rows = result.results ?? [];
  return rows.map((r) => r.plan as PlanId).filter((id) => PLAN_BY_ID.has(id));
}

export async function setUserSubscriptionsD1(
  userId: number,
  plans: PlanId[]
): Promise<void> {
  const valid = plans.filter((p) => PLAN_BY_ID.has(p));
  const db = await getTokenusageD1();
  const now = Date.now();
  // D1 supports batched statements via db.batch(). Wrap the delete +
  // inserts + setup-stamp in a single batch so the user's subscription
  // set flips atomically from the consumer's POV.
  const stmts = [
    db.prepare(`DELETE FROM user_subscriptions WHERE user_id = ?`).bind(userId),
    ...valid.map((p) =>
      db
        .prepare(
          `INSERT INTO user_subscriptions (user_id, plan, started_at)
           VALUES (?, ?, ?)`
        )
        .bind(userId, p, now)
    ),
    db
      .prepare(`UPDATE users SET subscriptions_setup_at = ? WHERE id = ?`)
      .bind(now, userId),
  ];
  await db.batch(stmts);
}
