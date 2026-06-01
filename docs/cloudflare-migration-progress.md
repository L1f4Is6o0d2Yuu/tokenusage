# Cloudflare migration — progress checklist

Companion to `cloudflare-migration.md`. Tracks slice-by-slice status so
sessions can resume without re-discovering what's still missing. Update
in the same commit that lands the slice.

## API routes — dual-runtime dispatch

A route is "dual" when `route.ts` is a thin dispatcher and both
`node-handler.ts` + `cloudflare-handler.ts` exist beside it.

| Route                       | Status | Notes |
| --------------------------- | ------ | ----- |
| `/api/health`               | dual ✓ | |
| `/api/ingest`               | dual ✓ | Primary agent path on CF. |
| `/api/share/save`           | dual ✓ | |
| `/api/shares/[slug]`        | dual ✓ | |
| `/api/upload`               | dual ✓ | CF returns 410 — tarball path is Node-only by design. |
| `/api/whoami`               | dual ✓ | CF reads `cf-connecting-ip` first. |
| `/api/sync-status`          | dual ✓ | |
| `/api/sync-wait`            | dual ✓ | CF skips long-poll (no EventEmitter in Workers); agent learns about manual syncs on next interval. |
| `/api/upload-progress`      | dual ✓ | |
| `/api/install-command`      | dual ✓ | |
| `/api/sync-now`             | TODO   | Needs `requestSyncD1` + decide what `notifySync` means on CF. |
| `/api/export`               | TODO   | Streams sessions JSON — needs D1 SELECT iteration. |
| `/api/agent`                | TODO   | Serves the agent binary metadata. May not need D1. |
| `/api/agent-script`         | TODO   | curl\|sh installer. Reads tokens → needs `findApiTokenD1`. |
| `/api/agent-node-script`    | TODO   | Same as agent-script, Node-only flavour. |
| `/api/agent-pause`          | TODO   | Calls `setAgentPaused` — needs D1 write. |
| `/api/agent-resume`         | TODO   | Same. |
| `/api/share/[period]`       | TODO   | Big read path (records + flavor). Touches `lib/adapters`. |

## Lib files — sqlite footprint

A file is "ready" when it can run in both runtimes (either runtime-
agnostic or paired with a `cloudflare-<x>.ts` sibling that the CF
handlers call).

| File                       | Status | Notes |
| -------------------------- | ------ | ----- |
| `lib/agent-health.ts`      | ready  | Pure function, no DB. |
| `lib/public-url.ts`        | ready  | Env + headers. |
| `lib/pricing.ts`           | ready  | Pure (price tables in code). |
| `lib/runtime.ts`           | ready  | Discriminator. |
| `lib/token-hash.ts`        | ready  | crypto only. |
| `lib/cloudflare-bindings.ts` | ready | D1 binding accessor. |
| `lib/cloudflare-auth.ts`   | partial | Has `readCurrentUser`, `authenticateApiToken`, `createApiToken`, `recordUserIp`. Missing: createSession, destroySession, authenticate, hashPassword (portable, just lift), createUser, signup helpers, invites, password reset, listTokens, revokeApiToken. |
| `lib/cloudflare-sync-state.ts` | partial | Has `getUserSyncState`, `recordUploadStarting`, `clearUploadInProgress`, `recordAgentVersion`. Missing: requestSync, setAgentPaused, setSyncInterval, markUploaded, getLatestAgentSeenAt. |
| `lib/cloudflare-shares.ts` | partial | Used by `/api/share/save` + `/api/shares/[slug]`. |
| `lib/auth.ts`              | sqlite-only | 28 exports. Used by Node handlers — keep until Node deploy retires. |
| `lib/sync-state.ts`        | sqlite-only | Same. |
| `lib/sync-events.ts`       | sqlite-only | Node EventEmitter — no CF equivalent yet. CF route skips long-poll. |
| `lib/shares.ts`            | sqlite-only | Node disk-backed PNG storage. |
| `lib/server-db.ts`         | sqlite-only | better-sqlite3 entrypoint. Stays Node-only. |
| `lib/subscriptions.ts`     | sqlite-only | Dashboard read path. Needs `cloudflare-subscriptions.ts`. |
| `lib/leaderboard.ts`       | sqlite-only | Leaderboard page. Needs `cloudflare-leaderboard.ts`. |
| `lib/audit.ts`             | sqlite-only | Audit writes. Needs `cloudflare-audit.ts`. |
| `lib/geoip.ts`             | sqlite-only | Geo cache table. May be droppable on CF (use Workers cf.* hints). |
| `lib/adapters/server.ts`   | sqlite-only | Multi-user records loader. Needs D1 mirror — biggest unblocker for `/dashboard`. |
| `lib/adapters/codex.ts`    | sqlite-only | Single-user local filesystem path — N/A on CF. |
| `lib/adapters/hermes.ts`   | sqlite-only | Same. |
| `lib/adapters/sample.ts`   | sqlite-only | Same. |

## Server components

| Page                       | Status | Blocked on |
| -------------------------- | ------ | ---------- |
| `/` (landing)              | ready  | None. |
| `/login`, `/signup`        | TODO   | Auth writes in `lib/auth.ts`. |
| `/dashboard`               | TODO   | `lib/adapters`, `lib/subscriptions`, `lib/sync-state`. |
| `/install`                 | TODO   | `lib/sync-state` + `lib/auth.lookupInvite`. |
| `/leaderboard`             | TODO   | `lib/leaderboard`. |
| `/subscriptions`           | TODO   | `lib/subscriptions`. |
| `/tokens`                  | TODO   | `lib/auth.listTokens`. |
| `/users`                   | TODO   | `lib/auth.listUsers`, `lib/auth.invites`. |
| `/pending`                 | TODO   | `lib/auth.readCurrentUser` works; verify no other DB call. |
| `/models`, `/prices`, `/about` | ready  | Read pricing or static. |

## Infra not yet provisioned

- [ ] `wrangler login` (user-interactive).
- [ ] `wrangler d1 create tokenusage` → patch real `database_id` into `wrangler.jsonc`.
- [ ] `wrangler d1 execute tokenusage --file migrations/0001_initial.sql`.
- [ ] `wrangler r2 bucket create tokenusage-shares`.
- [ ] Secrets: `SESSION_SECRET`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `OPENROUTER_API_KEY`, `TG_BOT_TOKEN`/`TG_CHAT_ID` if used.
- [ ] `pnpm cf:typegen` to regenerate `cloudflare-env.d.ts`.
- [ ] `wrangler deploy` to a `tokenusage-staging.workers.dev` subdomain.

## Data migration

- [ ] Export prod `/data/server.db` into D1 statements (script TBD; either `sqlite3 .dump` + sed, or a Node tool that streams INSERTs).
- [ ] Import existing `/data/shares/*.png` into the `tokenusage-shares` R2 bucket (key = `<slug>.png`).
- [ ] Reconcile counts: users, sessions, subscriptions, shares, auth_sessions, api_tokens, audit log.

## Agent

- [ ] Verify agent default upload path on CF deploy → `/api/ingest` (chunked JSON), not `/api/upload` (tarball).
- [ ] Migrate one real agent to staging Worker. Compare 24h of session counts vs Docker.

## Cutover

- [ ] Set `tokenusage.online` route on the Worker (Cloudflare DNS → Worker route).
- [ ] Flip DNS, keep Docker hot for fast rollback.
- [ ] Watch `/api/health` + audit log for 24h before retiring the Docker stack.
