# tokenusage

A local-first dashboard that shows how many tokens — and how many dollars — you've spent across multiple AI coding tools (Claude Code, Codex, DeepSeek, ...). Reads usage data straight from your local gateway / CLI logs. No backend, no telemetry, no account.

![tokenusage dashboard](docs/screenshot.png)

> Status: **v0.8**. Runs in two modes: **single-user** (the original — reads your local Hermes / Codex / Claude Code data straight from disk) or **multi-user** (central server + per-machine agents, with usernames + password auth, API tokens, and a `/api/ingest` endpoint). Plus everything from v0.7: per-session detail pages, CSV export, custom date range, this-month / this-year shortcuts, inline price editor at `/prices`, light/dark/system theme, 11-language UI from JSON. Screenshot above is from the bundled synthetic sample data.

## Features

- **Total spend, total tokens, input/output/cache breakdown** at a glance
- **Daily trend chart** (tokens + USD) over the selected window
- **Per-model breakdown table** with cost estimates
- **Period selector**: Today / 24h / 7d / 30d / All
- **Read-only** — your data never leaves the machine
- **Fallback sample data** so the dashboard renders even before you connect a real source

## Quickstart

```bash
pnpm install
pnpm sample        # generate data/sample.db (already committed; only needed if you customize)
pnpm dev
```

Open <http://localhost:3000>.

The dashboard auto-detects every supported source on the machine and merges them:

| Source | Path | Env override |
|---|---|---|
| Hermes gateway | `~/.hermes/state.db` | `TOKENUSAGE_HERMES_DB` |
| Codex CLI | `~/.codex/state_5.sqlite` + `~/.codex/sessions/**.jsonl` | `TOKENUSAGE_CODEX_DIR` |
| Claude Code | `~/.claude/projects/**/*.jsonl` | `TOKENUSAGE_CLAUDE_DIR` |

If none are present it falls back to the bundled synthetic sample database, so the dashboard always renders something.

## Multi-user mode (server + agents)

For sharing one dashboard across multiple machines (your home server hosts it, each laptop pushes its data in), run the dashboard as a server and install the agent on each machine you want to track.

### Server side

```bash
git clone https://github.com/L1f4Is6o0d2Yuu/tokenusage
cd tokenusage
pnpm install
pnpm build && pnpm start    # or `pnpm dev` while iterating
```

On first hit to <http://localhost:3000>, you're redirected to `/signup` to create the admin account. After that, every page requires login.

The server's data lives in `data/server.db` (gitignored). Override the path with:

```bash
TOKENUSAGE_SERVER_DB=/var/lib/tokenusage/server.db pnpm start
```

### Agent side (run on each machine that has Hermes / Codex / Claude Code data)

1. Sign in to the server, visit `/tokens`, and create one API token per machine. Copy the plaintext (it's shown only once).
2. On the machine, clone the repo and:

```bash
pnpm install
pnpm agent --server https://your-server.example --token tu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or via env vars (handy for cron / launchd / systemd timers):

```bash
TOKENUSAGE_SERVER=https://… TOKENUSAGE_TOKEN=tu_… pnpm agent
```

The agent is **idempotent** — every record is keyed by `(provider, externalId)` so it's safe to schedule it every few minutes via cron. Sample crontab line (every 10 minutes):

```
*/10 * * * * cd ~/tokenusage && /usr/local/bin/pnpm agent >> /var/log/tokenusage-agent.log 2>&1
```

`pnpm agent --dry-run` reports what it found without posting.

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Server-rendered overview (queries DB directly, no API routes)
│   └── layout.tsx
├── components/
│   ├── period-tabs.tsx   # URL-driven period selector
│   ├── usage-trend.tsx   # Recharts line chart (client component)
│   └── ui/               # shadcn/ui primitives
└── lib/
    ├── adapters/
    │   ├── hermes.ts     # better-sqlite3 readonly → ~/.hermes/state.db
    │   ├── codex.ts      # state_5.sqlite + last token_count event from each rollout JSONL
    │   ├── claude-code.ts # walks ~/.claude/projects/**.jsonl
    │   ├── sample.ts     # reads data/sample.db
    │   └── index.ts      # merges UsageRecords from every adapter that has data
    ├── pricing.ts        # loads data/prices.json (override) or data/prices.default.json
    ├── server-db.ts      # multi-user mode sqlite (users, api_tokens, sessions_data)
    ├── auth.ts           # scrypt password hashing, session tokens, API tokens
    ├── auth-guard.ts     # requireUser() — server-side guard for protected pages
    ├── aggregate.ts      # period filtering + group-by-model + daily rollup
    ├── format.ts         # tokens / USD / int formatters
    └── types.ts          # UsageRecord, ProviderAdapter, Aggregation
```

Adding a new adapter is a matter of implementing `ProviderAdapter` from `lib/types.ts` and registering it in `lib/adapters/index.ts`.

## Costs are estimates, not bills

Cost figures come from whatever your gateway recorded at the time of the request. They're useful as a rough budget signal but should not be reconciled against an invoice. Some sessions may have no cost recorded — those are summed into a `~$X` value with a "partial cost data" hint.

## Roadmap

- [x] Codex adapter — read `~/.codex/sessions/*.jsonl` + `state_5.sqlite`
- [x] Claude Code adapter — read `~/.claude/projects/**/*.jsonl`
- [x] Per-session detail page (`/sessions/[id]`)
- [x] Export filtered view to CSV (`/api/export?period=...`)
- [x] User-editable price overrides — drop a `data/prices.json` to override `data/prices.default.json`
- [x] Custom date range picker (period=custom + from/to URL params)
- [x] Inline price-table editor in the UI (`/prices`)
- [x] 11-language UI with cookie-persisted locale switcher
- [x] Translations stored as plain JSON in `src/i18n/dictionaries/*.json` (no TS knowledge required to contribute)
- [x] Light / dark / system theme toggle (cookie-driven, no flash)
- [x] This-month / this-year period shortcuts; trend chart auto-buckets by month when the window exceeds 90 days
- [x] Multi-user / shared-deployment mode — central server + per-machine agents
- [ ] Invite / second-user signup flow (today the first signup is the admin; further accounts require DB editing)
- [ ] OAuth (GitHub / Google) as an alternative to username + password
- [ ] Agent watch mode (live tail) instead of cron-style polling

## License

MIT
