<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent skills

Matt Pocock's engineering skills are installed under `.claude/skills/`. Run `/setup-matt-pocock-skills` again only to switch issue trackers or restart from scratch — otherwise edit the `docs/agents/*.md` files directly.

### Issue tracker

Issues live as GitHub issues on `L1f4Is6o0d2Yuu/tokenusage`, via the `gh` CLI (or the GitHub MCP tools in cloud sessions, which have no `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and one `docs/adr/` at the repo root, both created lazily by `/domain-modeling`. See `docs/agents/domain.md`.
