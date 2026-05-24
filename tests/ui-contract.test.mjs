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
  assert.match(control, /agent 离线/);
  assert.match(statusBar, /agentLive=\{agentLive\}/);
  assert.match(statusBar, /href="\/install#troubleshoot"/);
  assert.match(statusBar, /修复 Agent/);
  assert.match(installPage, /id="troubleshoot"/);
  assert.match(installPage, /tokenusage doctor/);
  assert.match(installPage, /tokenusage logs/);
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
  const source = read('../src/app/api/ingest/route.ts');
  assert.match(source, /markUploaded\(user\.id\)/);
  assert.match(source, /clearUploadInProgress\(user\.id\)/);
});

test('chunked ingest stores resolved Hermes costs instead of raw zero costs', () => {
  const source = read('../src/app/api/ingest/route.ts');
  assert.match(source, /resolveUsageCost\(/);
  assert.match(source, /cost_usd: resolvedCost\.costUsd/);
  assert.match(source, /cost_status: resolvedCost\.status/);
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
  const upload = read('../src/app/api/upload/route.ts');
  const ingest = read('../src/app/api/ingest/route.ts');
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
});

test('health exposes deployment build sha without replacing package version', () => {
  const route = read('../src/app/api/health/route.ts');
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
  const route = read('../src/app/api/sync-status/route.ts');
  const control = read('../src/components/sync-control.tsx');
  const page = read('../src/app/(app)/dashboard/page.tsx');
  const dashboard = read('../src/app/(app)/dashboard-client.tsx');
  const statusBar = read('../src/components/agent-status-bar.tsx');

  assert.match(helper, /AGENT_LIVE_THRESHOLD_MS = 90 \* 1000/);
  assert.match(helper, /isAgentLiveAt/);
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

  assert.match(source, /type SyncBlockReason = "offline" \| "paused" \| "stalled" \| "waiting" \| null/);
  assert.match(source, /setBlockReason\(data\.paused \? "paused" : "offline"\)/);
  assert.match(source, /setBlockReason\(uploadIsStalled \? "stalled" : "waiting"\)/);
  assert.match(source, /agent 已暂停/);
  assert.match(source, /上传卡住/);
  assert.match(source, /Agent 离线，先运行修复流程。/);
  assert.match(source, /Agent 已暂停，恢复后再同步。/);
  assert.match(source, /上传已开始但长时间没有完成。/);
  assert.match(source, /href="\/install#troubleshoot"/);
});

test('sync timeout distinguishes offline agent from stalled upload and stays visible', () => {
  const source = read('../src/components/sync-control.tsx');

  assert.match(source, /const WAIT_TIMEOUT_MS = 60 \* 1000/);
  assert.match(source, /const UPLOAD_STALL_TIMEOUT_MS = 10 \* 60 \* 1000/);
  assert.match(source, /requestIsWaiting && elapsed > WAIT_TIMEOUT_MS/);
  assert.match(source, /uploadIsStalled/);
  assert.match(source, /Hold the error until the user explicitly retries or dismisses it/);
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
