#!/bin/bash
# tokenusage agent — installed as a launchd / systemd service.
#
# Long-polls the server's /api/sync-wait endpoint. The connection releases
# either when the dashboard's "Sync now" button is clicked or after the
# server-side hold timeout (≤5 min). Each release triggers a tar+upload of
# the local Hermes / Codex / Claude Code data, but only if the user's
# configured heartbeat interval has elapsed since the last upload (so a
# noisy sync_now click doesn't repeatedly upload the same data).

set -uo pipefail

CONFIG_FILE="$HOME/.tokenusage/config.env"
STATE_FILE="$HOME/.tokenusage/state"
[ -f "$CONFIG_FILE" ] || { echo "[agent] missing $CONFIG_FILE — run install.sh first"; exit 1; }
# shellcheck disable=SC1091
. "$CONFIG_FILE"

# Persist last-upload timestamp across restarts so a crash-loop doesn't
# upload on every reboot.
if [ -f "$STATE_FILE" ]; then
  LAST_UPLOAD=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
else
  LAST_UPLOAD=0
fi
INTERVAL_SECONDS=300

ts() { date -u +%FT%TZ; }

upload() {
  TMP="$(mktemp -d -t tokenusage-XXXXXX)"

  mkdir -p "$TMP/payload"
  if [ -f "$HOME/.hermes/state.db" ]; then
    cp "$HOME/.hermes/state.db" "$TMP/payload/hermes.db"
  fi
  if [ -d "$HOME/.codex" ]; then
    mkdir -p "$TMP/payload/codex"
    [ -f "$HOME/.codex/state_5.sqlite" ] && cp "$HOME/.codex/state_5.sqlite" "$TMP/payload/codex/state_5.sqlite"
    [ -d "$HOME/.codex/sessions" ] && cp -R "$HOME/.codex/sessions" "$TMP/payload/codex/sessions"
  fi
  if [ -d "$HOME/.claude/projects" ]; then
    cp -R "$HOME/.claude/projects" "$TMP/payload/claude-projects"
  fi

  if [ -z "$(ls -A "$TMP/payload" 2>/dev/null)" ]; then
    echo "[$(ts)] no data to upload (none of ~/.hermes ~/.codex ~/.claude/projects exist)"
    rm -rf "$TMP"
    return
  fi

  tar czf "$TMP/payload.tar.gz" -C "$TMP/payload" .
  SIZE=$(wc -c < "$TMP/payload.tar.gz" | tr -d ' ')

  if curl -fsS --max-time 600 \
    -X POST "$SERVER/api/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/gzip" \
    --data-binary "@$TMP/payload.tar.gz" \
    -o /dev/null; then
    LAST_UPLOAD=$(date +%s)
    echo "$LAST_UPLOAD" > "$STATE_FILE"
    echo "[$(ts)] upload OK ($SIZE bytes)"
  else
    echo "[$(ts)] upload FAILED"
  fi

  rm -rf "$TMP"
}

echo "[$(ts)] tokenusage agent starting; server=$SERVER"

# Eager first upload so the dashboard fills in within seconds of install,
# *unless* we already uploaded recently (within 60s — protection against
# rapid restart loops).
NOW=$(date +%s)
if [ $((NOW - LAST_UPLOAD)) -gt 60 ]; then
  upload
fi

while true; do
  # Long-poll. Server returns within max(user_interval, 5 min).
  RESP=$(curl -fsS --max-time 360 \
    "$SERVER/api/sync-wait" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo '')

  NEW_INTERVAL=$(printf '%s' "$RESP" | sed -nE 's/.*"intervalSeconds":([0-9]+).*/\1/p')
  if [ -n "$NEW_INTERVAL" ]; then
    INTERVAL_SECONDS=$NEW_INTERVAL
  fi

  SYNC=$(printf '%s' "$RESP" | sed -nE 's/.*"sync":(true|false).*/\1/p')
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_UPLOAD))

  if [ "$SYNC" = "true" ]; then
    upload
  elif [ "$ELAPSED" -ge "$INTERVAL_SECONDS" ]; then
    upload
  fi

  # Tiny pause to avoid hot loops if the server is rejecting us
  sleep 1
done
