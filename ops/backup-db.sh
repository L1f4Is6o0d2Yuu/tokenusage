#!/bin/sh
# Daily snapshot of the prod server.db.
#
# Runs `sqlite3 .backup` against the live DB inside the app container —
# safe for a running WAL-mode DB, unlike a raw cp which can capture a
# torn page if a write commits mid-copy. The resulting file lands on the
# host where journalctl + filesystem snapshots cover it, and we keep the
# last 14 by mtime so the directory doesn't grow unbounded.
#
# Cron: daily at 03:30 UTC (low traffic window in CN/SG morning).
#
#   30 3 * * * root /opt/tokenusage/ops/backup-db.sh \
#     >> /var/log/tokenusage-backup.log 2>&1

set -u

BACKUP_DIR="${BACKUP_DIR:-/var/backups/tokenusage}"
CONTAINER="${CONTAINER:-tokenusage-app-1}"
KEEP_DAYS="${KEEP_DAYS:-14}"
NOTIFY="${NOTIFY:-/opt/tokenusage/ops/notify.sh}"

mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y-%m-%dT%H%M%SZ)
SNAPSHOT="$BACKUP_DIR/server.${TS}.db"

# Snapshot inside the container, then copy out.
if ! docker exec "$CONTAINER" sqlite3 /data/server.db ".backup /tmp/server.snapshot.db" 2>/dev/null; then
  /bin/sh "$NOTIFY" "🚨 backup FAILED" "sqlite3 .backup inside $CONTAINER returned non-zero"
  exit 1
fi
if ! docker cp "$CONTAINER:/tmp/server.snapshot.db" "$SNAPSHOT" 2>/dev/null; then
  /bin/sh "$NOTIFY" "🚨 backup FAILED" "docker cp from $CONTAINER returned non-zero"
  docker exec "$CONTAINER" rm -f /tmp/server.snapshot.db 2>/dev/null
  exit 1
fi
docker exec "$CONTAINER" rm -f /tmp/server.snapshot.db 2>/dev/null

# Compress to save disk (~40% reduction on a typical sqlite file).
gzip -9 "$SNAPSHOT"
SNAPSHOT="${SNAPSHOT}.gz"

# Quick sanity check — file is non-empty.
if [ ! -s "$SNAPSHOT" ]; then
  /bin/sh "$NOTIFY" "🚨 backup FAILED" "snapshot $SNAPSHOT is empty"
  rm -f "$SNAPSHOT"
  exit 1
fi

SIZE=$(du -h "$SNAPSHOT" | awk '{print $1}')
logger -t tokenusage-backup "wrote $SNAPSHOT ($SIZE)"

# Rotate: keep last $KEEP_DAYS by mtime.
find "$BACKUP_DIR" -maxdepth 1 -name 'server.*.db.gz' -mtime "+$KEEP_DAYS" -delete

exit 0
