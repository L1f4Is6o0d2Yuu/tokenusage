#!/usr/bin/env node
import Database from "better-sqlite3";

const DEFAULT_DB = process.env.TOKENUSAGE_SERVER_DB || "/data/server.db";
const DEFAULT_OFFLINE_HOURS = 24;
const DEFAULT_STALE_UPLOAD_HOURS = 24;
const DEFAULT_MIN_AGENT_VERSION = "0.27.0";
const MAX_TELEGRAM_LENGTH = 1800;

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--") && !arg.includes("=")));
const dbPath = argValue("--db", DEFAULT_DB);
const format = argValue("--format", "text");
const offlineHours = Number(argValue("--offline-hours", process.env.TOKENUSAGE_AGENT_OFFLINE_HOURS || DEFAULT_OFFLINE_HOURS));
const staleUploadHours = Number(argValue("--stale-upload-hours", process.env.TOKENUSAGE_AGENT_STALE_UPLOAD_HOURS || DEFAULT_STALE_UPLOAD_HOURS));
const minAgentVersion = argValue("--min-agent-version", process.env.TOKENUSAGE_MIN_AGENT_VERSION || DEFAULT_MIN_AGENT_VERSION);
const notify = flags.has("--notify");

function hoursSince(ts, now) {
  return ts == null ? null : Math.max(0, (now - ts) / 3_600_000);
}

function versionParts(version) {
  return String(version || "")
    .replace(/^v/i, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function versionLt(actual, minimum) {
  if (!actual) return false;
  const a = versionParts(actual);
  const b = versionParts(minimum);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
}

function roundedHours(value) {
  if (value == null) return null;
  return Math.round(value * 10) / 10;
}

function classify(row, now) {
  const agentSeenHours = hoursSince(row.agentSeenAt, now);
  const uploadedHours = hoursSince(row.lastUploadedAt, now);
  const issues = [];

  if (row.paused) issues.push("paused");
  if (row.agentSeenAt == null) issues.push("agent_never_seen");
  else if (agentSeenHours > offlineHours) issues.push("agent_offline");

  if (row.lastUploadedAt == null) issues.push("upload_never_seen");
  else if (uploadedHours > staleUploadHours) issues.push("upload_stale");

  if (versionLt(row.agentVersion, minAgentVersion)) issues.push("agent_version_old");

  return {
    userId: row.id,
    username: row.username,
    email: row.email,
    paused: row.paused,
    agentVersion: row.agentVersion,
    agentSeenHours: roundedHours(agentSeenHours),
    uploadedHours: roundedHours(uploadedHours),
    issues,
  };
}

function readUsers() {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(`
      SELECT u.id,
             u.username,
             u.email,
             u.agent_version AS agentVersion,
             COALESCE(u.agent_paused, 0) AS paused,
             u.last_uploaded_at AS lastUploadedAt,
             MAX(t.last_used_at) AS agentSeenAt
      FROM users u
      LEFT JOIN api_tokens t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id
    `).all();
  } finally {
    db.close();
  }
}

function buildReport(now = Date.now()) {
  const users = readUsers().map((row) => classify({
    ...row,
    paused: row.paused === 1,
  }, now));
  const affected = users.filter((user) => user.issues.length > 0);
  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    dbPath,
    thresholds: {
      offlineHours,
      staleUploadHours,
      minAgentVersion,
    },
    totals: {
      users: users.length,
      affected: affected.length,
      paused: users.filter((user) => user.issues.includes("paused")).length,
      offline: users.filter((user) => user.issues.includes("agent_offline") || user.issues.includes("agent_never_seen")).length,
      staleUpload: users.filter((user) => user.issues.includes("upload_stale") || user.issues.includes("upload_never_seen")).length,
      oldVersion: users.filter((user) => user.issues.includes("agent_version_old")).length,
    },
    affected,
  };
}

function formatUser(user) {
  const labels = user.issues.join(", ");
  const seen = user.agentSeenHours == null ? "never" : `${user.agentSeenHours}h`;
  const uploaded = user.uploadedHours == null ? "never" : `${user.uploadedHours}h`;
  const version = user.agentVersion || "unknown";
  return `- #${user.userId} ${user.username} <${user.email || "no-email"}>: ${labels}; seen=${seen}; uploaded=${uploaded}; version=${version}; paused=${user.paused}`;
}

function formatText(report) {
  const lines = [
    `tokenusage Agent health report (${report.generatedAt})`,
    `thresholds: offline>${report.thresholds.offlineHours}h, upload>${report.thresholds.staleUploadHours}h, minAgentVersion=${report.thresholds.minAgentVersion}`,
    `totals: users=${report.totals.users}, affected=${report.totals.affected}, offline=${report.totals.offline}, staleUpload=${report.totals.staleUpload}, oldVersion=${report.totals.oldVersion}, paused=${report.totals.paused}`,
  ];
  if (report.affected.length === 0) {
    lines.push("all clear");
  } else {
    lines.push(...report.affected.slice(0, 20).map(formatUser));
    if (report.affected.length > 20) lines.push(`... ${report.affected.length - 20} more`);
  }
  return lines.join("\n");
}

async function sendTelegram(text) {
  const botToken = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!botToken || !chatId) {
    throw new Error("TG_BOT_TOKEN/TG_CHAT_ID not configured");
  }
  const body = new URLSearchParams({ chat_id: chatId, text: text.slice(0, MAX_TELEGRAM_LENGTH) });
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`telegram send failed: ${res.status}`);
}

const report = buildReport();
const text = formatText(report);

if (format === "json") {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(text);
}

if (notify && report.totals.affected > 0) {
  await sendTelegram(`🔎 ${text}`);
  console.error("telegram_notification=sent");
} else if (notify) {
  console.error("telegram_notification=skipped_all_clear");
}
