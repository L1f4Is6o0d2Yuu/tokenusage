#!/bin/sh
# Host-side disk watchdog + /tmp sweep for tokenusage.
#
# Runs from cron every 5 minutes. Two jobs:
#   1. Sweep orphaned /tmp/tokenusage-upload-* dirs in the app container
#      (mtime > 30min). Belt-and-suspenders: the upload route should clean
#      these itself, but a stale orphan must never silently fill the disk.
#   2. Alert via notify.sh if host disk usage crosses thresholds.
#
# Alert state is kept in $STATE_DIR to avoid spamming TG every 5 minutes
# once we've already fired for a given level. Re-arms when usage drops
# below WARN_PCT - HYSTERESIS.

set -u

# Tuning ------------------------------------------------------------------
WARN_PCT="${WARN_PCT:-80}"
CRIT_PCT="${CRIT_PCT:-90}"
HYSTERESIS="${HYSTERESIS:-5}"          # re-arm when pct drops below WARN - this
SWEEP_OLDER_MIN="${SWEEP_OLDER_MIN:-30}"
CONTAINER="${CONTAINER:-tokenusage-app-1}"
STATE_DIR="${STATE_DIR:-/var/lib/tokenusage-watch}"
NOTIFY="${NOTIFY:-/opt/tokenusage/ops/notify.sh}"

mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/last-level"   # one of: ok / warn / crit

cur_pct=$(df --output=pcent / | tail -1 | tr -dc '0-9')
cur_avail=$(df -h --output=avail / | tail -1 | tr -d ' ')
last_level=$(cat "$STATE_FILE" 2>/dev/null || echo ok)

# 1) Sweep orphan upload dirs (best-effort; container may not be running) -
sweep_summary=""
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  swept=$(docker exec "$CONTAINER" sh -c \
    "find /tmp -maxdepth 1 -name 'tokenusage-upload-*' -mmin +$SWEEP_OLDER_MIN -print -exec rm -rf {} + 2>/dev/null | wc -l" \
    2>/dev/null | tr -dc '0-9')
  swept=${swept:-0}
  if [ "$swept" -gt 0 ]; then
    sweep_summary="swept $swept orphan upload dirs"
    logger -t tokenusage-watch "$sweep_summary"
  fi
fi

# 2) Threshold check + alert ----------------------------------------------
new_level=ok
if [ "$cur_pct" -ge "$CRIT_PCT" ]; then
  new_level=crit
elif [ "$cur_pct" -ge "$WARN_PCT" ]; then
  new_level=warn
fi

# Re-arm: only flip back to ok if we've dropped well below the warn line.
if [ "$new_level" = "ok" ] && [ "$last_level" != "ok" ]; then
  recover_pct=$((WARN_PCT - HYSTERESIS))
  if [ "$cur_pct" -lt "$recover_pct" ]; then
    /bin/sh "$NOTIFY" "✅ 磁盘恢复" \
      "disk now ${cur_pct}% (avail ${cur_avail}). previously ${last_level}."
    echo ok > "$STATE_FILE"
  fi
  exit 0
fi

# Only notify when level escalates (ok → warn, warn → crit, ok → crit).
case "$last_level:$new_level" in
  ok:warn|ok:crit|warn:crit)
    emoji="⚠️"
    [ "$new_level" = "crit" ] && emoji="🚨"
    body="disk at ${cur_pct}% (avail ${cur_avail}, thresholds warn=${WARN_PCT}% crit=${CRIT_PCT}%)."
    [ -n "$sweep_summary" ] && body="$body
$sweep_summary."
    /bin/sh "$NOTIFY" "${emoji} 磁盘 ${new_level}" "$body"
    echo "$new_level" > "$STATE_FILE"
    ;;
  *)
    # No state change: stay quiet (don't spam every 5 min).
    [ "$new_level" != "$last_level" ] && echo "$new_level" > "$STATE_FILE"
    ;;
esac
