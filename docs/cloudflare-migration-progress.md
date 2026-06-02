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
| `lib/pricing.ts`           | ready  | Bundles `data/prices.default.json` via ESM import; fs override is Node-only and gated by `isCloudflareRuntime()`. |
| `lib/runtime.ts`           | ready  | Discriminator. |
| `lib/token-hash.ts`        | ready  | crypto only. |
| `lib/cloudflare-bindings.ts` | ready | D1 binding accessor (now includes `batch()`). |
| `lib/cloudflare-auth.ts`   | partial | Has `readCurrentUser`, `authenticateApiToken`, `createApiToken`, `recordUserIp`, **`createSession`**, **`destroySession`**, **`findUserByEmail`**, **`authenticate`**, **`createUser`**, **`isFirstRun`**. Missing: createPendingOauthUser, activateUser, invites (5), password reset (3), listTokens, revokeApiToken, listUsers, readAgentVersion. |
| `lib/cloudflare-sync-state.ts` | partial | Has `getUserSyncState`, `recordUploadStarting`, `clearUploadInProgress`, `recordAgentVersion`. Missing: requestSync, setAgentPaused, setSyncInterval, markUploaded, getLatestAgentSeenAt. |
| `lib/cloudflare-shares.ts` | partial | Used by `/api/share/save` + `/api/shares/[slug]`. |
| `lib/cloudflare-adapters.ts` | **ready** | `loadServerRecordsD1` + `countServerRecordsD1`. Unblocks the dashboard data read path. |
| `lib/cloudflare-subscriptions.ts` | **ready** | `hasFinishedSubscriptionsSetupD1`, `listUserSubscriptionsD1`, `setUserSubscriptionsD1`. PLAN_CATALOG re-used from Node module. |
| `lib/cloudflare-leaderboard.ts` | **ready** | `loadLeaderboardD1` + `setShowOnLeaderboardD1`. Pure helpers (`tierFor`, `pickFlavor`, `rowFlavor`) stay in the shared module. |
| `lib/auth.ts`              | **dispatch** | Public API stays the same shape; sync→async where needed; each function dispatches to `cloudflare-auth.ts` on the CF runtime. Still sqlite-only internals: invites (5), password reset (3), createPendingOauthUser, activateUser, listUsers, readAgentVersion. |
| `lib/sync-state.ts`        | **dispatch** | All 8 functions are now async + dispatch to `cloudflare-sync-state.ts`. |
| `lib/sync-events.ts`       | sqlite-only | Node EventEmitter — no CF equivalent yet. CF route skips long-poll. |
| `lib/shares.ts`            | sqlite-only | Node disk-backed PNG storage. |
| `lib/server-db.ts`         | **dispatch** | `isMultiUserMode()` short-circuits to `true` on CF (no fs check). `isFirstRun()` async + dispatch. `openServerDb()` remains Node-only. |
| `lib/subscriptions.ts`     | **dispatch** | All 4 DB functions async + dispatch. Catalog `PLAN_BY_ID` exported for CF re-use. |
| `lib/leaderboard.ts`       | **dispatch** | `loadLeaderboard` + `setShowOnLeaderboard` async + dispatch. Pure helpers shared. |
| `lib/audit.ts`             | **dispatch** | CF path logs the event via `console.warn` (visible in `wrangler tail`) and still fires `notifyAuditAlert`; D1 audit table is a TODO. |
| `lib/geoip.ts`             | sqlite-only | Geo cache table. May be droppable on CF (use Workers cf.* hints). |
| `lib/adapters/server.ts`   | **dispatch** | Both functions async + dispatch to `cloudflare-adapters.ts`. |
| `lib/adapters/codex.ts`    | sqlite-only | Single-user local filesystem path — N/A on CF. |
| `lib/adapters/hermes.ts`   | sqlite-only | Same. |
| `lib/adapters/sample.ts`   | sqlite-only | Same. |

## Server components

| Page                       | Status | Blocked on |
| -------------------------- | ------ | ---------- |
| `/` (landing)              | ready  | None. |
| `/login`, `/signup`        | **wired** | `auth-actions.ts` now `await`s every DB call. Login/first-run-signup work in both runtimes. Invite redemption + password reset still go through Node-only paths inside `auth.ts`. |
| `/dashboard`               | **wired** | Page awaits `countServerRecords`, `getUserSyncState`, `listUserSubscriptions`, `hasFinishedSubscriptionsSetup`. Renders identically under either runtime. |
| `/install`                 | **wired** | Page awaits the four DB reads. `<InstallAutoRefresh/>` (client) is runtime-neutral. |
| `/leaderboard`             | **wired** | Page awaits `loadLeaderboard`; `setShowOnLeaderboard` action awaited. Flavor rotation cookie unchanged. |
| `/subscriptions`           | **wired** | Page awaits `listUserSubscriptions`; action awaits `setUserSubscriptions`. |
| `/tokens`                  | **wired** | Page awaits `listTokens` + `getUserSyncState`; actions await `createApiToken`, `revokeApiToken`, `setSyncInterval`. |
| `/users`                   | TODO   | `lib/auth.listUsers`, invites — still sqlite-only. |
| `/pending`                 | TODO   | `lib/auth.readCurrentUser` works; verify no other DB call. |
| `/models`, `/prices`, `/about` | ready  | Read pricing or static. `/prices` editor APIs throw a clear error on CF runtime. |

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
