# Cloudflare migration plan

This branch is the Cloudflare-native migration track for Tokenusage. The current
production service remains the Docker/Caddy deployment until a staged D1/R2
migration is verified and explicitly cut over.

## Target architecture

- App runtime: Cloudflare Workers running Next.js through `@opennextjs/cloudflare`.
- Static assets: OpenNext assets served by Workers assets binding.
- Relational data: Cloudflare D1, replacing `/data/server.db` and `better-sqlite3`
  in the Worker runtime.
- Share poster PNGs: Cloudflare R2, replacing `/data/shares`.
- Agent upload path: chunked `/api/ingest` JSON records. The legacy tarball
  `/api/upload` path is Docker-only unless redesigned around R2 + async work.

## Why this is not a direct hosting flip

The existing Docker app intentionally uses Node-native features that Workers do
not provide as persistent infrastructure:

- `better-sqlite3` native bindings and a writable `/data/server.db` file.
- Disk-backed share images under `/data/shares`.
- `/api/upload` spawning `tar` and extracting uploaded archives into a temp dir.
- Single-user local adapters reading `~/.hermes`, `~/.codex`, and `~/.claude` from
  the host filesystem.

Cloudflare deployment is therefore central-server multi-user mode only: local
machines keep running the agent, and the agent pushes records to the Worker.

## Current preflight files

- `open-next.config.ts` uses the default Cloudflare OpenNext adapter.
- `wrangler.jsonc` defines the Worker entrypoint, assets binding,
  `nodejs_compat`, and observability.
- `package.json` adds:
  - `cf:build`
  - `cf:preview`
  - `cf:deploy`
  - `cf:typegen`
- `next.config.ts` disables standalone output only when
  `TOKENUSAGE_CLOUDFLARE=1`, preserving the Docker production build path.

## Migration slices

1. Preflight build evidence
   - Run `pnpm cf:build` and record any adapter failures.
   - Keep Docker production untouched.

2. D1 data layer
   - Convert `src/lib/server-db.ts` access to an async adapter boundary.
   - Keep a `better-sqlite3` implementation for Docker.
   - Add D1 migrations for the existing schema.
   - Port critical routes first: auth/session/token, `/api/ingest`, dashboard
     reads, `/api/health`, admin users, subscriptions, audit log.

3. R2 share storage
   - Move `src/lib/shares.ts` PNG storage from local disk to an R2 binding.
   - Import existing `/data/shares/*.png` during staging migration.

4. Cloudflare upload policy
   - Keep `/api/ingest` as the supported agent path.
   - Return a clear unsupported response for `/api/upload` in Cloudflare builds,
     or later redesign it with R2 multipart upload plus async parsing.

5. Staging data migration
   - Export production `/data/server.db` into a staging D1 database.
   - Reconcile counts for users, sessions, subscriptions, shares, auth sessions,
     API token metadata, and audit log.
   - Compare dashboard totals and leaderboard aggregates against Docker prod.

6. Cutover
   - Move one real agent to staging first.
   - Only after explicit approval, point `tokenusage.online` at the Worker and
     keep a rollback path to Docker.

## Safety rule

Do not migrate production data, bind the production domain, rotate credentials,
or cut DNS from this branch without explicit approval.
