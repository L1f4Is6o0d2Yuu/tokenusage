# tokenusage

A local-first dashboard that shows how many tokens — and how many dollars — you've spent across multiple AI coding tools (Claude Code, Codex, DeepSeek, ...). Reads usage data straight from your local gateway / CLI logs. No backend, no telemetry, no account.

![tokenusage dashboard](docs/screenshot.png)

> Status: **early — v0.1**. Currently ships a single adapter for the Hermes gateway. Codex and Claude Code direct adapters are planned for v0.2. Screenshot above is from the bundled synthetic sample data.

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

If `~/.hermes/state.db` exists, the dashboard will read from it automatically. Otherwise it falls back to the synthetic sample database.

### Pointing at a non-default Hermes path

```bash
TOKENUSAGE_HERMES_DB=/path/to/state.db pnpm dev
```

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
    │   ├── sample.ts     # reads data/sample.db
    │   └── index.ts      # picks first adapter with data
    ├── aggregate.ts      # period filtering + group-by-model + daily rollup
    ├── format.ts         # tokens / USD / int formatters
    └── types.ts          # UsageRecord, ProviderAdapter, Aggregation
```

Adding a new adapter is a matter of implementing `ProviderAdapter` from `lib/types.ts` and registering it in `lib/adapters/index.ts`.

## Costs are estimates, not bills

Cost figures come from whatever your gateway recorded at the time of the request. They're useful as a rough budget signal but should not be reconciled against an invoice. Some sessions may have no cost recorded — those are summed into a `~$X` value with a "partial cost data" hint.

## Roadmap

- [ ] Codex adapter — read `~/.codex/sessions/*.jsonl` directly
- [ ] Claude Code adapter — read `~/.claude/projects/**/*.jsonl`
- [ ] Custom date range picker
- [ ] Per-session detail page
- [ ] Export filtered view to CSV

## License

MIT
