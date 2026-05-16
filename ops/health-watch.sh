#!/bin/sh
# Container health watchdog for tokenusage.
#
# Runs from cron every 5 minutes. Watches `docker inspect` Health.Status of
# the app container and TG-alerts on transitions. Stateful via $STATE_DIR
# to avoid spamming once we've already fired for a given level.
#
# Tracked states:
#   healthy   — container healthcheck passing
#   unhealthy — healthcheck failing (FailingStreak > retries)
#   missing   — container not running / not found
#
# Transitions that alert:
#   healthy → unhealthy   (⚠️ app unhealthy)
#   healthy → missing     (🚨 app gone)
#   unhealthy → missing   (🚨 app gone)
#   unhealthy → healthy   (✅ recovered)
#   missing → healthy     (✅ recovered)
#
# `starting` is treated as "no change" so a normal compose redeploy doesn't
# fire false positives during the start_period.

set -u

CONTAINER="${CONTAINER:-tokenusage-app-1}"
STATE_DIR="${STATE_DIR:-/var/lib/tokenusage-watch}"
NOTIFY="${NOTIFY:-/opt/tokenusage/ops/notify.sh}"

mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/last-health"

last_level=$(cat "$STATE_FILE" 2>/dev/null || echo healthy)

# Determine current level ------------------------------------------------
if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  new_level=missing
  detail="container ${CONTAINER} not found"
else
  state=$(docker inspect --format '{{.State.Status}}' "$CONTAINER" 2>/dev/null)
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null)
  streak=$(docker inspect --format '{{if .State.Health}}{{.State.Health.FailingStreak}}{{else}}0{{end}}' "$CONTAINER" 2>/dev/null)

  case "$state:$health" in
    running:healthy|running:none)
      new_level=healthy
      detail="state=${state} health=${health}"
      ;;
    running:starting)
      # Skip — let start_period play out without state change.
      exit 0
      ;;
    running:unhealthy)
      new_level=unhealthy
      detail="state=${state} health=${health} failing_streak=${streak}"
      ;;
    *)
      new_level=missing
      detail="state=${state} health=${health}"
      ;;
  esac
fi

# Decide whether to alert ------------------------------------------------
emoji=""
subject=""
case "$last_level:$new_level" in
  healthy:unhealthy)
    emoji="⚠️"; subject="app unhealthy" ;;
  healthy:missing|unhealthy:missing)
    emoji="🚨"; subject="app missing" ;;
  unhealthy:healthy|missing:healthy)
    emoji="✅"; subject="app recovered" ;;
esac

if [ -n "$subject" ]; then
  /bin/sh "$NOTIFY" "${emoji} ${subject}" "$detail"
fi

if [ "$new_level" != "$last_level" ]; then
  echo "$new_level" > "$STATE_FILE"
fi

exit 0
