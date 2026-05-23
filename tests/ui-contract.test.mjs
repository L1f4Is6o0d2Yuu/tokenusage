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
  assert.match(control, /agentLive: boolean/);
  assert.match(control, /!installed \|\| paused \|\| !agentLive/);
  assert.match(control, /agent 离线/);
  assert.match(statusBar, /agentLive=\{agentLive\}/);
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
  assert.match(install, /api\/agent-node-script/);
  assert.match(nodeAgent, /SPOOL_DIR/);
  assert.match(nodeAgent, /CHECKPOINT_FILE/);
  assert.match(nodeAgent, /CHUNK = 100/);
  assert.match(nodeAgent, /nextIndex/);
  assert.match(nodeAgent, /AbortSignal\.timeout\(45_000\)/);
});
