import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('welcome arsenal save redirects to dashboard with a success marker', () => {
  const actions = read('../src/app/(app)/subscriptions/actions.ts');
  assert.match(actions, /redirect\("\/dashboard\?settings=saved"\)/);

  const page = read('../src/app/(app)/dashboard/page.tsx');
  assert.match(page, /settings\?: string/);
  assert.match(page, /settings === "saved"/);

  const client = read('../src/app/(app)/dashboard-client.tsx');
  assert.match(client, /settingsSaved/);
  assert.match(client, /role="status"/);
});

test('sync control renders inline percentage telemetry next to the sync button', () => {
  const source = read('../src/components/sync-control.tsx');
  assert.match(source, /Math\.round\(progress\)\}\%/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuenow=\{Math\.round\(progress\)\}/);
  assert.match(source, /formatRate\(bytesPerSecond\)/);
  assert.match(source, /uploadTotalBytes/);
});

test('sync control does not auto-trigger or allow stuck progress when agent is offline', () => {
  const control = read('../src/components/sync-control.tsx');
  const statusBar = read('../src/components/agent-status-bar.tsx');
  const installPage = read('../src/app/(app)/install/page.tsx');
  assert.match(control, /agentLive: boolean/);
  assert.match(control, /!installed \|\| paused \|\| !agentLive/);
  // Push model: the agent only talks when it has data or when its daily
  // check-in comes due, so the UI claims "no recent activity", not "offline".
  assert.match(control, /agent 无近期活动/);
  // The dashboard must not fire a sync on mount — that was one request plus
  // a 1Hz status poll on every page open, re-confirming data the agent had
  // already pushed.
  assert.doesNotMatch(control, /sessionStorage\.getItem\("tu-auto-synced-at"\)/);
  assert.match(control, /Deliberately no auto-sync on mount/);
  assert.match(statusBar, /agentLive=\{agentLive\}/);
  assert.match(statusBar, /href="\/install#troubleshoot"/);
  assert.match(statusBar, /修复 Agent/);
  assert.match(installPage, /id="troubleshoot"/);
  // The remediation copy itself is localized, so assert on the dictionary
  // rather than the page source — the page only renders `ot.troubleshootStepN`.
  const zh = JSON.parse(read('../src/i18n/dictionaries/zh-CN.json'));
  const steps = [
    zh.onboarding.troubleshootStep1,
    zh.onboarding.troubleshootStep2,
    zh.onboarding.troubleshootStep3,
  ].join('\n');
  assert.match(steps, /tokenusage doctor/);
  assert.match(steps, /tokenusage logs/);
});

test('sync completion uses server timestamps only so browser clock skew cannot pin progress at 90%', () => {
  const source = read('../src/components/sync-control.tsx');
  assert.match(source, /uploaded > 0 && uploaded >= requested/);
  assert.doesNotMatch(source, /uploaded > startedAt/);
});

test('logged-in users have a persistent sidebar entry to regenerate the agent install command', () => {
  const sidebar = read('../src/components/sidebar.tsx');
  const installPage = read('../src/app/(app)/install/page.tsx');
  const types = read('../src/i18n/types.ts');
  const zh = read('../src/i18n/dictionaries/zh-CN.json');

  assert.match(sidebar, /href: "\/install", label: t\.nav\.install/);
  assert.match(types, /install: string/);
  assert.match(zh, /"install": "安装 Agent"/);
  assert.doesNotMatch(installPage, /sessionCount > 0\) redirect\("\/dashboard"\)/);
  assert.match(installPage, /recovery入口/);
});

test('chunked ingest marks sync completion for polling dashboard progress', () => {
  const source = read('../src/app/api/ingest/node-handler.ts');
  const cloudflare = read('../src/app/api/ingest/cloudflare-handler.ts');
  assert.match(source, /markUploaded\(user\.id\)/);
  assert.match(source, /clearUploadInProgress\(user\.id\)/);
  assert.match(cloudflare, /UPDATE users SET last_uploaded_at = \?/);
  assert.match(cloudflare, /upload_started_at = NULL/);
});

test('chunked ingest stores resolved Hermes costs instead of raw zero costs', () => {
  const source = read('../src/app/api/ingest/node-handler.ts');
  const cloudflare = read('../src/app/api/ingest/cloudflare-handler.ts');
  assert.match(source, /resolveUsageCost\(/);
  assert.match(source, /cost_usd: resolvedCost\.costUsd/);
  assert.match(source, /cost_status: resolvedCost\.status/);
  assert.match(cloudflare, /resolveUsageCost\(/);
  assert.match(cloudflare, /resolvedCost\.costUsd/);
  assert.match(cloudflare, /resolvedCost\.status/);
});

test('subscription picker keeps selections in parent state and submits hidden selected ids', () => {
  const source = read('../src/components/subscriptions-picker.tsx');
  assert.match(source, /const \[selected, setSelected\] = useState<Set<string>>/);
  assert.match(source, /selectedIds\.map\(\(id\) => \(/);
  assert.match(source, /type="hidden" name="plan" value=\{id\}/);
  assert.match(source, /checked=\{selected\.has\(p\.id\)\}/);
  assert.match(source, /onToggle=\{togglePlan\}/);
  assert.match(source, /checked=\{checked\}/);
  assert.doesNotMatch(source, /defaultChecked=\{checked\}/);
  assert.doesNotMatch(source, /name="plan"\s*\n\s*checked=\{checked\}/);
});

test('usage heatmap uses inline SVG fill and opacity so intensity survives browser color-mix quirks', () => {
  const source = read('../src/components/usage-heatmap.tsx');
  assert.match(source, /function heatCellStyle/);
  assert.match(source, /fill: level === 0 \? "var\(--bg-panel-2\)" : "var\(--accent\)"/);
  assert.match(source, /style=\{heatCellStyle\(lvl\)\}/);
  assert.doesNotMatch(source, /color-mix\(in oklch/);
});

test('dashboard remains accessible after install even while uploaded records are still settling', () => {
  const source = read('../src/app/(app)/dashboard/page.tsx');
  assert.doesNotMatch(source, /redirect\("\/install"\)/);
  assert.match(source, /showOnboarding/);
});

test('agent start prefers resumable small-record ingest over monolithic tar upload', () => {
  const shell = read('../agent/tokenusage');
  const nodeAgent = read('../agent/index.mjs');
  const install = read('../agent/install.sh.template');

  assert.match(shell, /agent-node\.mjs/);
  assert.match(shell, /cmd_update\(\)/);
  assert.match(shell, /api\/agent-script/);
  assert.match(shell, /api\/agent-node-script/);
  assert.match(shell, /exec "\$exe" start/);
  assert.match(shell, /TOKENUSAGE_SERVER="\$SERVER"/);
  assert.match(shell, /node "\$NODE_AGENT_FILE"/);
  assert.match(shell, /node agent failed.*falling back to legacy tar upload/s);
  assert.match(install, /api\/agent-node-script/);
  assert.match(install, /registers the launchd \/ systemd service/);
  assert.match(shell, /<key>KeepAlive<\/key><true\/>/);
  assert.match(shell, /Restart=always/);
  assert.match(shell, /launchctl kickstart -k/);
  assert.match(shell, /systemctl --user enable --now tokenusage-agent/);
  assert.match(nodeAgent, /const SPOOL_DIR =/);
  assert.match(nodeAgent, /const RECORDS_FILE =/);
  assert.match(nodeAgent, /const CHECKPOINT_FILE =/);
  assert.match(nodeAgent, /CHUNK = 100/);
  assert.match(nodeAgent, /nextIndex/);
  assert.match(nodeAgent, /AbortSignal\.timeout\(45_000\)/);
  assert.match(nodeAgent, /collectSource\("codex", readCodex\)/);
});

test('upload and ingest failures are recorded in audit_log and forwarded to Telegram alerts', () => {
  const audit = read('../src/lib/audit.ts');
  const alerts = read('../src/lib/ops-alerts.ts');
  const upload = read('../src/app/api/upload/node-handler.ts');
  const ingest = read('../src/app/api/ingest/node-handler.ts');
  const ingestCloudflare = read('../src/app/api/ingest/cloudflare-handler.ts');
  const compose = read('../docker-compose.yml');

  assert.match(audit, /\| "upload_failed"/);
  assert.match(audit, /\| "ingest_failed"/);
  assert.match(audit, /notifyAuditAlert\(/);
  assert.match(alerts, /new Set\(\["upload_failed", "ingest_failed"\]\)/);
  assert.match(alerts, /process\.env\.TG_BOT_TOKEN/);
  assert.match(alerts, /process\.env\.TG_CHAT_ID/);
  assert.match(alerts, /sendMessage/);
  assert.match(alerts, /JSON\.stringify\(safe\)/);
  assert.doesNotMatch(alerts, /Authorization/i);
  assert.match(compose, /TG_BOT_TOKEN: \$\{TG_BOT_TOKEN:-\}/);
  assert.match(compose, /TG_CHAT_ID: \$\{TG_CHAT_ID:-\}/);
  assert.match(upload, /action: "upload_failed"/);
  assert.match(upload, /reason:/);
  assert.match(ingest, /action: "ingest_failed"/);
  assert.match(ingest, /reason:/);
  assert.match(ingestCloudflare, /action: "ingest_failed"/);
  assert.match(ingestCloudflare, /recordIngestFailed\("invalid_json"\)/);
});

test('ops agent health report is dry-run first and safe for Telegram alerts', () => {
  const script = read('../ops/agent-health-report.mjs');
  const pkg = read('../package.json');
  const dockerfile = read('../Dockerfile');

  assert.match(pkg, /"ops:agent-health": "node ops\/agent-health-report\.mjs"/);
  assert.match(dockerfile, /COPY --from=builder --chown=nextjs:nodejs \/app\/ops \.\/ops/);
  assert.match(script, /const notify = flags\.has\("--notify"\)/);
  assert.match(script, /TOKENUSAGE_AGENT_OFFLINE_HOURS/);
  assert.match(script, /TOKENUSAGE_AGENT_STALE_UPLOAD_HOURS/);
  assert.match(script, /TOKENUSAGE_MIN_AGENT_VERSION/);
  assert.match(script, /agent_never_seen/);
  assert.match(script, /agent_offline/);
  assert.match(script, /upload_never_seen/);
  assert.match(script, /upload_stale/);
  assert.match(script, /agent_version_old/);
  assert.match(script, /paused/);
  assert.match(script, /process\.env\.TG_BOT_TOKEN/);
  assert.match(script, /process\.env\.TG_CHAT_ID/);
  assert.match(script, /MAX_TELEGRAM_LENGTH/);
  assert.doesNotMatch(script, /Authorization/i);
  assert.doesNotMatch(script, /token_hash/);
});

test('health exposes deployment build sha without replacing package version', () => {
  const route = read('../src/app/api/health/node-handler.ts');
  const dockerfile = read('../Dockerfile');
  const compose = read('../docker-compose.yml');

  assert.match(route, /buildSha: string/);
  assert.match(route, /process\.env\.TOKENUSAGE_GIT_SHA/);
  assert.match(route, /buildSha: BUILD_SHA/);
  assert.match(dockerfile, /ARG TOKENUSAGE_GIT_SHA=unknown/);
  assert.match(dockerfile, /ENV TOKENUSAGE_GIT_SHA=\$TOKENUSAGE_GIT_SHA/);
  assert.match(compose, /TOKENUSAGE_GIT_SHA: \$\{TOKENUSAGE_GIT_SHA:-unknown\}/);
});

test('app route loading skeleton is generic and shimmer based', () => {
  const loading = read('../src/app/(app)/loading.tsx');

  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /tu-shimmer/);
  assert.match(loading, /max-w-6xl/);
  assert.match(loading, /page-agnostic/);
  assert.doesNotMatch(loading, /animate-pulse/);
  assert.doesNotMatch(loading, /KPI grid/);
});

test('prices page and server actions are admin-only in multi-user mode', () => {
  const guard = read('../src/lib/auth-guard.ts');
  const page = read('../src/app/(app)/prices/page.tsx');
  const actions = read('../src/app/(app)/prices/actions.ts');

  assert.match(guard, /export async function requireAdmin/);
  assert.match(page, /await requireAdmin\(\)/);
  assert.match(actions, /await requireAdmin\(\)/);
  assert.doesNotMatch(page, /await requireUser\(\)/);
});

test('sync-status returns canonical agent observability fields', () => {
  const helper = read('../src/lib/agent-health.ts');
  const state = read('../src/lib/sync-state.ts');
  // The route is a thin runtime dispatcher since the Cloudflare split; the
  // observability fields live in the per-runtime handlers.
  const route = read('../src/app/api/sync-status/node-handler.ts');
  const control = read('../src/components/sync-control.tsx');
  const page = read('../src/app/(app)/dashboard/page.tsx');
  const dashboard = read('../src/app/(app)/dashboard-client.tsx');
  const statusBar = read('../src/components/agent-status-bar.tsx');

  // 26h, not 90s: under the push model the agent's quietest legitimate
  // cadence is the once-a-day heartbeat, so a 90s window would report every
  // healthy agent as dead for 23 hours out of 24.
  assert.match(helper, /AGENT_LIVE_THRESHOLD_MS = 26 \* 60 \* 60 \* 1000/);
  assert.match(helper, /isAgentLiveAt/);
  // Heartbeat writes are coalesced — they are the D1 row-write budget.
  assert.match(helper, /shouldWriteAgentSeen/);
  assert.match(state, /agentSeenAt: number \| null/);
  assert.match(state, /agentLive: boolean/);
  assert.match(state, /agentVersion: string \| null/);
  assert.match(state, /MAX\(t\.last_used_at\)/);
  assert.match(state, /u\.agent_version AS av/);
  assert.match(state, /isAgentLiveAt\(agentSeenAt, Date\.now\(\)\)/);
  assert.match(route, /agentSeenAt: state\.agentSeenAt/);
  assert.match(route, /agentLive: state\.agentLive/);
  assert.match(route, /agentVersion: state\.agentVersion/);
  assert.match(control, /agentLive: boolean/);
  assert.match(control, /data\.paused \|\| data\.agentLive === false/);
  assert.doesNotMatch(page, /getLatestAgentSeenAt/);
  assert.match(dashboard, /agentSeenAt: number \| null/);
  assert.match(dashboard, /agentLive: boolean/);
  assert.match(dashboard, /agentVersion: string \| null/);
  assert.match(dashboard, /agentSeenAt=\{syncState\.agentSeenAt\}/);
  assert.match(dashboard, /agentLive=\{syncState\.agentLive\}/);
  assert.match(statusBar, /agentLive: initialAgentLive/);
  assert.match(statusBar, /isAgentLiveAt\(agentSeenAt, now\)/);
});

test('sync control gives actionable paused offline and stalled states', () => {
  const source = read('../src/components/sync-control.tsx');

  // "waiting" became "queued": with no agent polling, a request the agent
  // hasn't picked up yet is the expected path, not a failure.
  assert.match(source, /type SyncBlockReason = "offline" \| "paused" \| "stalled" \| "queued" \| null/);
  assert.match(source, /setBlockReason\(data\.paused \? "paused" : "offline"\)/);
  assert.match(source, /setBlockReason\(uploadIsStalled \? "stalled" : "queued"\)/);
  assert.match(source, /agent 已暂停/);
  assert.match(source, /上传卡住/);
  assert.match(source, /Agent 超过 26 小时没有活动/);
  assert.match(source, /Agent 已暂停，恢复后再同步。/);
  assert.match(source, /上传已开始但长时间没有完成。/);
  assert.match(source, /href="\/install#troubleshoot"/);
  // A queued request is not broken, so it must not offer a repair link and
  // must tell the user the instant path.
  assert.match(source, /blockReason === "offline" \|\| blockReason === "stalled"/);
  assert.match(source, /tokenusage sync/);
});

test('sync timeout distinguishes offline agent from stalled upload and stays visible', () => {
  const source = read('../src/components/sync-control.tsx');

  assert.match(source, /const WAIT_TIMEOUT_MS = 60 \* 1000/);
  assert.match(source, /const UPLOAD_STALL_TIMEOUT_MS = 10 \* 60 \* 1000/);
  assert.match(source, /requestIsWaiting && elapsed > WAIT_TIMEOUT_MS/);
  assert.match(source, /uploadIsStalled/);
  assert.match(source, /parked server-side/);
  assert.match(source, /function dismissTimeout\(\)/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => \{\s*setPhase\("idle"\)/s);
});

test('admin access console combines invites and members without blocking on geo lookup', () => {
  const auth = read('../src/lib/auth.ts');
  const page = read('../src/app/(app)/users/page.tsx');
  const logPage = read('../src/app/(app)/users/[id]/log/page.tsx');

  assert.match(auth, /lastUploadedAt: number \| null/);
  assert.match(auth, /agentSeenAt: number \| null/);
  assert.match(auth, /agentVersion: string \| null/);
  assert.match(auth, /MAX\(t\.last_used_at\)/);
  assert.match(page, /Access console/);
  assert.match(page, /id="invites"/);
  assert.match(page, /id="members"/);
  assert.match(page, /const \[dict, users, invites\] = await Promise\.all/);
  assert.doesNotMatch(page, /lookupGeo/);
  assert.match(page, /<TableHead>Agent<\/TableHead>/);
  assert.match(page, /agentLive \? "live" : "offline"/);
  assert.match(page, /v\{u\.agentVersion\}/);
  assert.match(page, /uploaded \{formatAgo\(u\.lastUploadedAt, now\)\}/);
  assert.match(page, /UPLOAD_STALE_MS/);
  assert.match(page, /href=\{`\/users\/\$\{u\.id\}\/log`\}/);
  assert.match(logPage, /await requireAdmin\(\)/);
  assert.match(logPage, /readRecentAudit\(100, target\.id\)/);
  assert.match(logPage, /Agent observability fields/);
  assert.match(logPage, /Recent audit events/);
});


test('cloudflare migration branch has OpenNext preflight config and documents native blockers', () => {
  const pkg = read('../package.json');
  const nextConfig = read('../next.config.ts');
  const wrangler = read('../wrangler.jsonc');
  const openNext = read('../open-next.config.ts');
  const migration = read('../docs/cloudflare-migration.md');
  const uploadRoute = read('../src/app/api/upload/route.ts');
  const uploadNodeHandler = read('../src/app/api/upload/node-handler.ts');
  const runtime = read('../src/lib/runtime.ts');
  const d1Migration = read('../migrations/0001_initial.sql');
  const ingestRoute = read('../src/app/api/ingest/route.ts');
  const ingestCloudflare = read('../src/app/api/ingest/cloudflare-handler.ts');
  const healthRoute = read('../src/app/api/health/route.ts');
  const shareSaveRoute = read('../src/app/api/share/save/route.ts');
  const shareImageRoute = read('../src/app/api/shares/[slug]/route.ts');
  const cloudflareBindings = read('../src/lib/cloudflare-bindings.ts');
  const cloudflareShares = read('../src/lib/cloudflare-shares.ts');
  const sharePage = read('../src/app/s/[slug]/page.tsx');
  const gitignore = read('../.gitignore');
  const eslintConfig = read('../eslint.config.mjs');

  assert.match(pkg, /"cf:build": "TOKENUSAGE_CLOUDFLARE=1 opennextjs-cloudflare build"/);
  assert.match(pkg, /"cf:preview": "TOKENUSAGE_CLOUDFLARE=1 opennextjs-cloudflare build && opennextjs-cloudflare preview"/);
  assert.match(wrangler, /"main": "\.open-next\/worker\.js"/);
  assert.match(wrangler, /"compatibility_flags": \["nodejs_compat"\]/);
  assert.match(wrangler, /"TOKENUSAGE_RUNTIME": "cloudflare"/);
  assert.match(wrangler, /"binding": "TOKENUSAGE_DB"/);
  assert.match(wrangler, /"database_name": "tokenusage"/);
  assert.match(wrangler, /"binding": "TOKENUSAGE_SHARES"/);
  assert.match(wrangler, /"bucket_name": "tokenusage-shares"/);
  assert.match(openNext, /defineCloudflareConfig\(\)/);
  assert.match(nextConfig, /const isCloudflareBuild = process\.env\.TOKENUSAGE_CLOUDFLARE === "1"/);
  assert.match(nextConfig, /process\.env\.TOKENUSAGE_DISABLE_STANDALONE === "1" \|\| isCloudflareBuild/);
  assert.match(migration, /Cloudflare D1/);
  assert.match(migration, /Cloudflare R2/);
  assert.match(migration, /legacy tarball/);
  assert.match(migration, /without explicit approval/);
  assert.match(uploadRoute, /isCloudflareRuntime\(\)/);
  assert.match(uploadRoute, /status: 410/);
  assert.match(uploadRoute, /api\/ingest agent path/);
  assert.match(uploadRoute, /await import\("\.\/node-handler"\)/);
  assert.match(uploadNodeHandler, /spawn\(\s*"tar"/s);
  assert.match(runtime, /TOKENUSAGE_RUNTIME === "cloudflare"/);
  assert.match(d1Migration, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(d1Migration, /CREATE TABLE IF NOT EXISTS sessions_data/);
  assert.match(d1Migration, /CREATE TABLE IF NOT EXISTS audit_log/);
  assert.match(ingestRoute, /await import\("\.\/cloudflare-handler"\)/);
  assert.match(ingestRoute, /await import\("\.\/node-handler"\)/);
  assert.match(ingestCloudflare, /getTokenusageD1\(\)/);
  assert.match(ingestCloudflare, /authenticateApiTokenD1\(/);
  assert.match(ingestCloudflare, /ON CONFLICT\(user_id, provider, external_id\)/);
  assert.match(healthRoute, /await import\("\.\/cloudflare-handler"\)/);
  assert.match(healthRoute, /await import\("\.\/node-handler"\)/);
  assert.match(shareSaveRoute, /await import\("\.\/cloudflare-handler"\)/);
  assert.match(shareImageRoute, /await import\("\.\/cloudflare-handler"\)/);
  assert.match(cloudflareBindings, /TOKENUSAGE_DB/);
  assert.match(cloudflareBindings, /TOKENUSAGE_SHARES/);
  assert.match(cloudflareShares, /bucket\.put\(shareObjectKey\(slug\)/);
  assert.match(cloudflareShares, /bucket\.get\(shareObjectKey\(slug\)\)/);
  assert.match(sharePage, /await import\("@\/lib\/cloudflare-shares"\)/);
  assert.match(gitignore, /\/\.open-next\//);
  assert.match(gitignore, /\/\.wrangler\//);
  assert.match(eslintConfig, /"\.open-next\/\*\*"/);
  assert.match(eslintConfig, /"\.wrangler\/\*\*"/);
});



test('agent pushes on local change instead of polling the server', () => {
  const agent = read('../agent/tokenusage');

  // The old loop was `curl /api/sync-wait; sleep 1` forever. On Node the
  // server's 90s hold paced it to ~950 requests/agent/day; on Workers, where
  // the handler answered immediately, it degraded to ~79,000/day — one user
  // could exhaust the 100k/day free tier alone.
  assert.doesNotMatch(agent, /curl[^\n]*\/api\/sync-wait/);
  assert.match(agent, /\/api\/agent-checkin/);

  // Change detection is local, so an idle machine makes zero requests.
  assert.match(agent, /has_new_data\(\)/);
  assert.match(agent, /find "\$d" -newer "\$SYNC_MARKER" -type f -print -quit/);

  // The marker must be a real file: an epoch-second marker rebuilt via
  // `touch -d` sits at T.0 while the files it covers sit at T.4, so every one
  // of them reads as newer forever and the agent pushes on every scan.
  assert.match(agent, /SYNC_MARKER="\$CONFIG_DIR\/last-sync\.marker"/);

  // The stamp is taken before collection starts, so a write landing mid-upload
  // stays newer than the marker and goes out on the next push rather than
  // being silently marked as sent.
  assert.match(agent, /START_MARKER="\$\(mktemp -t tokenusage-start-XXXXXX\)"/);
  // Every success path stamps it — including the node-agent path, which
  // returns early and would otherwise leave the loop pushing every scan.
  assert.match(agent, /mark_uploaded "\$START_MARKER"\n      return 0/);

  // A failed upload or a paused agent must back off, not retry every scan.
  assert.match(agent, /SKIP_UNTIL=/);
});

test('agent check-in spends a D1 row-write only on real work', () => {
  const lib = read('../src/lib/agent-checkin.ts');
  const health = read('../src/lib/agent-health.ts');
  const nodeHandler = read('../src/app/api/agent-checkin/node-handler.ts');
  const cfHandler = read('../src/app/api/agent-checkin/cloudflare-handler.ts');
  const auth = read('../src/lib/auth.ts');
  const cfAuth = read('../src/lib/cloudflare-auth.ts');
  const cfSyncState = read('../src/lib/cloudflare-sync-state.ts');

  // D1 free tier is 100k row-writes/day. Two unconditional writes per agent
  // request (api_tokens.last_used_at + users.agent_version) was the real
  // ceiling — tighter than the request quota itself.
  assert.match(auth, /export type TokenTouchMode = "throttled" \| "force" \| "never"/);
  assert.match(health, /shouldWriteAgentSeen/);
  assert.match(health, /AGENT_SEEN_WRITE_INTERVAL_MS/);

  // Heartbeats coalesce to one write/day; data and manual syncs force one.
  assert.match(lib, /touchModeFor/);
  assert.match(lib, /REAL_WORK/);
  assert.match(nodeHandler, /touchModeFor\(reason\)/);
  assert.match(cfHandler, /touchModeFor\(reason\)/);

  // agent_version is read-before-write: reported every request, changes ~monthly.
  assert.match(cfSyncState, /if \(row\?\.v === version\) return;/);
  assert.match(auth, /if \(row\?\.v === version\) return;/);
  assert.match(cfAuth, /shouldWriteAgentSeen\(row\.token_last_used_at, now\)/);

  // Both runtimes must agree on the wire shape.
  assert.match(nodeHandler, /buildCheckinResponse/);
  assert.match(cfHandler, /buildCheckinResponse/);
});

test('deprecated sync-wait still holds so legacy agents cannot hot-loop', () => {
  const cf = read('../src/app/api/sync-wait/cloudflare-handler.ts');
  const node = read('../src/app/api/sync-wait/node-handler.ts');
  const hold = read('../src/app/api/sync-wait/legacy-hold.ts');

  // Pre-v0.28 agents have no pacing of their own beyond `sleep 1`, so the
  // server-side hold is the only throttle. Answering fast on Workers is what
  // turned a 91s cycle into a 1.1s one.
  assert.match(hold, /LEGACY_HOLD_MS = 90 \* 1000/);
  assert.match(cf, /await new Promise\(\(r\) => setTimeout\(r, LEGACY_HOLD_MS\)\)/);
  assert.match(node, /waitSync\(user\.id, holdMs\)/);
  assert.match(cf, /deprecated: true/);
  assert.match(node, /deprecated: true/);

  // Legacy polls are heartbeats too — they must not burn a write each.
  assert.match(cf, /"throttled"/);
  assert.match(node, /"throttled"/);
});

test('dashboard and install page do not poll on a hot loop', () => {
  const control = read('../src/components/sync-control.tsx');
  const refresh = read('../src/components/install-auto-refresh.tsx');
  const installPage = read('../src/app/(app)/install/page.tsx');

  // 1Hz status polling meant 60 requests/min for as long as a sync was
  // outstanding, and the install page's 8s refresh was 450 requests/hour per
  // open tab, forever.
  assert.match(control, /const POLL_MS = 3000/);
  assert.doesNotMatch(control, /const POLL_MS = 1000/);
  assert.match(installPage, /intervalMs=\{uploadInProgress \? 3000 : 30000\}/);

  // Both must stop when nobody is looking, and the install page must give up.
  assert.match(refresh, /visibilitychange/);
  assert.match(control, /visibilitychange/);
  assert.match(refresh, /maxMs/);
});
