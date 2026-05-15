#!/bin/sh
# Send a notification to the configured channel.
#
# Usage: notify.sh "subject" "body"
#
# Reads TG_BOT_TOKEN and TG_CHAT_ID from /etc/tokenusage-notify.env (mode 600,
# kept out of the repo). Fails silently if config is missing — alerting must
# never break the caller that invoked it.

set -u

CONFIG="${TOKENUSAGE_NOTIFY_CONFIG:-/etc/tokenusage-notify.env}"
[ -r "$CONFIG" ] || { echo "notify: $CONFIG unreadable, skip" >&2; exit 0; }
# shellcheck disable=SC1090
. "$CONFIG"

[ -n "${TG_BOT_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || {
  echo "notify: TG_BOT_TOKEN or TG_CHAT_ID unset, skip" >&2
  exit 0
}

SUBJECT="${1:-tokenusage alert}"
BODY="${2:-(no body)}"
HOST=$(hostname)
TS=$(date -Is)

MSG="🔔 *${SUBJECT}*
host: \`${HOST}\`
time: \`${TS}\`

${BODY}"

curl -fsS --max-time 10 \
  -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TG_CHAT_ID}" \
  --data-urlencode "text=${MSG}" \
  --data-urlencode "parse_mode=Markdown" \
  -o /dev/null \
  || echo "notify: telegram send failed" >&2
