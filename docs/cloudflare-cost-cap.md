# Cloudflare staging — cost cap & cleanup

Belt + suspenders so the staging account never accidentally bills past
the free tier. Three independent layers — even if one fails, the
others contain the blast radius.

## Layer 1: R2 lifecycle rules (active)

Configured on `tokenusage-shares-staging`. Source of truth:
[`ops/r2-lifecycle.json`](../ops/r2-lifecycle.json).

| Rule | Action | Cap |
| --- | --- | --- |
| `expire-after-30-days` | delete | every object older than 30 days |
| `abort-incomplete-multipart-1-day` | clean | half-finished multipart uploads ≥ 24 h |

To reapply after editing:

```bash
source ~/.config/tokenusage/staging.env
pnpm exec wrangler r2 bucket lifecycle set tokenusage-shares-staging \
  --file ops/r2-lifecycle.json
```

To audit:

```bash
pnpm exec wrangler r2 bucket lifecycle list tokenusage-shares-staging
```

Effect: the bucket can grow at most `~ 30 × daily_write_size` before R2
itself starts deleting. For tokenusage's share posters (≤ 500 KB
each), that means you'd need ~21000 unique shares in a month to touch
the 10 GB free-storage cap — orders of magnitude past anything staging
will ever produce.

## Layer 2: D1 lifecycle (TODO — Cron Trigger)

D1's free tier is generous (5 GB storage, 5M rows read / 100k rows
written per day). The shares table is the only one that grows
unbounded with feature use. When/if we add a Cron Trigger to the
Worker, the right cleanup is:

```sql
DELETE FROM shares
WHERE created_at < unixepoch('now', '-30 days') * 1000;
```

Wire it as a Workers Cron in `wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 4 * * *"]   // 04:00 UTC daily
}
```

…plus a `scheduled(event, env, ctx)` export that runs the DELETE.
Until then the R2 lifecycle is the active brake (D1 rows pointing at
already-deleted R2 objects will still serve 404 cleanly).

## Layer 3: Billing notifications (manual setup)

Cloudflare doesn't offer hard spend caps on R2 or D1 — they only
support **alerts** that you action manually. Set them via:

1. <https://dash.cloudflare.com/profile/notifications> → Add
2. Choose **Billing → Usage based billing notification**
3. Pick services: **R2 Storage**, **R2 Class A operations**,
   **R2 Class B operations**, **D1 Database** if it's enabled
4. Threshold: **$0.01** (anything over zero means the free tier was
   blown — investigate before it grows)

Cloudflare emails you when the running tally crosses the threshold.
There's no API to script this — set them once from the dashboard.

## What's free vs not (as of 2026-06-02)

| Service | Free tier | Cost past free |
| --- | --- | --- |
| R2 storage | 10 GB-month | $0.015 / GB-month |
| R2 Class A ops (writes, lists) | 1 M / month | $4.50 / M |
| R2 Class B ops (reads) | 10 M / month | $0.36 / M |
| R2 egress | unlimited (zero) | — |
| D1 storage | 5 GB | $0.75 / GB-month |
| D1 reads | 5 M / day | $0.001 / M |
| D1 writes | 100 k / day | $1.00 / M |
| Workers requests | 100 k / day | $5/mo plan: 10 M included |
| Workers CPU | 10 ms / req | paid: 30 s / req |

Numbers worth keeping in mind so the on-call instinct knows whether a
spike is "normal traffic" or "investigate now."

## What's NOT covered

- **Workers Paid plan upgrade** — manual, conscious choice. The
  `/api/share/[period]` route returns 501 on CF until we decide we
  want it (see commit history for the why).
- **Compromised credentials draining the account** — the staging
  deploy token (`tokenusage-staging-deploy`) is scoped to D1 + R2 +
  Workers Edit on this account only, but it can still create+fill
  arbitrarily large buckets if leaked. Rotate it if the laptop is
  lost: `https://dash.cloudflare.com/profile/api-tokens`.
- **DNS or zone changes** — the prod-zone DNS-01 token
  (`tokenusage-caddy-dns01`) is separate and minimal-scoped.
