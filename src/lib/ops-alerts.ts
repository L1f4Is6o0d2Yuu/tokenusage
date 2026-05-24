import "server-only";

const ALERT_ACTIONS = new Set(["upload_failed", "ingest_failed"]);
const MAX_MESSAGE_LENGTH = 1800;

function summarizeMeta(meta: Record<string, unknown> | undefined): string {
  if (!meta) return "";
  const safe: Record<string, unknown> = {};
  for (const key of ["reason", "bytes", "agentVersion", "retryAfter", "submitted", "maxBytes"] as const) {
    if (meta[key] != null) safe[key] = meta[key];
  }
  if (typeof meta.message === "string") safe.message = meta.message.slice(0, 240);
  return Object.keys(safe).length > 0 ? `\nmeta: ${JSON.stringify(safe)}` : "";
}

export function notifyAuditAlert(params: {
  action: string;
  userId: number | null;
  meta?: Record<string, unknown>;
}): void {
  if (!ALERT_ACTIONS.has(params.action)) return;

  const botToken = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!botToken || !chatId) return;

  const reason =
    typeof params.meta?.reason === "string" ? ` (${params.meta.reason})` : "";
  const text = [
    `🔔 tokenusage ${params.action}${reason}`,
    `userId: ${params.userId ?? "unknown"}`,
    `time: ${new Date().toISOString()}`,
    summarizeMeta(params.meta),
  ]
    .join("\n")
    .slice(0, MAX_MESSAGE_LENGTH);

  const body = new URLSearchParams({ chat_id: chatId, text });
  void fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    body,
  }).catch((e) => {
    console.error("[ops-alert] telegram send failed:", e);
  });
}
