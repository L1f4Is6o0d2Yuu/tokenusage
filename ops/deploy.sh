#!/bin/sh
# Deploy a given commit to the production docker-compose stack.
#
# Usage: deploy.sh <git-sha-or-ref>
#
# Runnable two ways, and they do exactly the same thing:
#   - by hand on the box:  /opt/tokenusage/ops/deploy.sh main
#   - by the CD workflow:  scp'd to /tmp and run over SSH
#
# The CD workflow copies *its own* checkout of this file to the box rather
# than running the copy already there. That matters: the on-disk copy is
# whatever the currently-deployed commit shipped, so a fix to this script
# could never deploy itself. It also means the very first CD run works on a
# box that has never seen this file.
#
# Rollback is not a separate mode — it is just a deploy of the older SHA,
# either automatically when the health gate fails, or by dispatching the
# workflow again with that SHA.
#
# Env knobs:
#   REPO_DIR        checkout to deploy from      (default /opt/tokenusage)
#   HEALTH_TIMEOUT  seconds to wait for healthy  (default 180)
#   SKIP_BACKUP=1   skip the pre-deploy DB snapshot
#   ALLOW_DIRTY=1   deploy even if the tree has uncommitted changes

set -eu

TARGET_REF=${1:?usage: deploy.sh <git-sha-or-ref>}
REPO_DIR=${REPO_DIR:-/opt/tokenusage}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-180}
NOTIFY=${NOTIFY:-$REPO_DIR/ops/notify.sh}

log() { echo "[deploy] $*"; }
die() { echo "[deploy] FATAL: $*" >&2; exit 1; }

# notify.sh already fails silently when unconfigured; keep alerting from ever
# breaking a deploy that otherwise succeeded.
notify() {
  [ -r "$NOTIFY" ] || return 0
  /bin/sh "$NOTIFY" "$1" "$2" >/dev/null 2>&1 || true
}

# Set once the pre-deploy state is known; rollback() is a no-op before that.
PREV_SHA=""
PREV_CONTAINER=""
HAVE_ROLLBACK_IMAGE=""

# Undo a failed deploy: restore the tree *and* the image, then bring the
# stack back. The tree matters as much as the image — ./Caddyfile is
# bind-mounted, so leaving it at the new commit would run the new edge
# config against the old app.
rollback() {
  reason=$1
  echo "[deploy] FAILED: $reason" >&2

  if [ -z "$PREV_SHA" ]; then
    notify "🚨 deploy FAILED" "$reason
No rollback point was established — stack may be down, check the box."
    exit 1
  fi

  log "rolling back to $PREV_SHA"
  git checkout --quiet --detach "$PREV_SHA" || log "WARNING: could not restore tree to $PREV_SHA"

  if [ -n "$HAVE_ROLLBACK_IMAGE" ]; then
    docker image tag tokenusage:rollback tokenusage:latest || log "WARNING: could not restore image tag"
  fi

  TOKENUSAGE_GIT_SHA=$PREV_SHA
  export TOKENUSAGE_GIT_SHA

  # No --build: the point is to reuse the last known-good image, and a
  # rebuild here would just reproduce whatever broke.
  if $DC up -d </dev/null; then
    log "rolled back to $PREV_SHA"
    notify "🚨 deploy FAILED — rolled back" "$reason

Restored: \`${PREV_SHA}\`"
  else
    notify "🚨 deploy FAILED — ROLLBACK ALSO FAILED" "$reason

Tried to restore \`${PREV_SHA}\` and compose up failed. Manual intervention needed."
  fi
  exit 1
}

cd "$REPO_DIR" || die "no checkout at $REPO_DIR"

# Compose v2 is the target, but don't break a box still on the v1 binary.
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  die "neither 'docker compose' nor 'docker-compose' is available"
fi

# A dirty tree on production means somebody hand-edited a file. Clobbering
# that silently loses work, so stop unless explicitly told otherwise.
if [ -z "${ALLOW_DIRTY:-}" ] && [ -n "$(git status --porcelain)" ]; then
  git status --short >&2
  die "working tree is dirty — commit, stash, or re-run with ALLOW_DIRTY=1"
fi

PREV_SHA=$(git rev-parse HEAD)
git fetch --prune origin
TARGET_SHA=$(git rev-parse --verify "${TARGET_REF}^{commit}") ||
  die "cannot resolve '$TARGET_REF' to a commit"

log "current : $PREV_SHA"
log "target  : $TARGET_SHA ($TARGET_REF)"

if [ "$PREV_SHA" = "$TARGET_SHA" ]; then
  log "already at target commit — rebuilding anyway to pick up any image drift"
fi

# ---------------------------------------------------------------- backup ---
# Reuses the existing WAL-safe sqlite3 .backup path rather than a raw cp.
# A failed backup aborts the deploy: the whole point is having a restore
# point if the new build turns out to be bad.
if [ -n "${SKIP_BACKUP:-}" ]; then
  log "SKIP_BACKUP set — no pre-deploy snapshot"
elif [ -r ops/backup-db.sh ]; then
  log "snapshotting server.db"
  sh ops/backup-db.sh </dev/null || die "pre-deploy backup failed — refusing to deploy"
else
  log "ops/backup-db.sh not readable here — skipping snapshot"
fi

# --------------------------------------------------------------- rollback --
# Keep the currently-running image under a stable tag so a failed deploy can
# be undone without a rebuild.
if docker image inspect tokenusage:latest >/dev/null 2>&1; then
  docker image tag tokenusage:latest tokenusage:rollback
  HAVE_ROLLBACK_IMAGE=1
  log "tagged current image as tokenusage:rollback"
else
  log "no existing tokenusage:latest — first deploy, nothing to roll back to"
fi

# Container ID before the deploy. If this is unchanged afterwards, compose
# decided nothing needed replacing and the "new" code never actually started.
PREV_CONTAINER=$($DC ps -q app </dev/null 2>/dev/null || true)

# ----------------------------------------------------------------- deploy --
# Detached HEAD is deliberate: a deploy pins an exact commit, and rollback
# targets a commit that is behind the branch tip. Every run re-fetches and
# re-checks-out explicitly, so nothing here depends on a branch being checked
# out between runs.
log "checking out $TARGET_SHA"
git checkout --quiet --detach "$TARGET_SHA"

# Compose reads TOKENUSAGE_GIT_SHA for both the image build arg and the
# container's runtime env. Shell env wins over .env for interpolation, so
# this overrides whatever .env may hold without editing that file — .env
# holds the box's secrets and must not be touched by a deploy.
TOKENUSAGE_GIT_SHA=$TARGET_SHA
export TOKENUSAGE_GIT_SHA

log "building and starting containers"
$DC up -d --build </dev/null || rollback "compose build/up failed"

# ------------------------------------------------------------ health gate --
# Two things get verified, because either alone can lie:
#
#   1. the app container was actually replaced — otherwise compose no-op'd
#      and the old process is still serving;
#   2. /api/health reports ok AND the SHA we just deployed.
#
# Honest caveat on (2): buildSha comes from the container's env, which compose
# sets from TOKENUSAGE_GIT_SHA. So it proves "started at this commit", not
# "this image was compiled from this commit". Check (1), plus the fact that
# --build ran against the checked-out tree, is what backs the stronger claim.
wait_healthy() {
  want=$1
  waited=0
  while [ "$waited" -lt "$HEALTH_TIMEOUT" ]; do
    raw=$($DC exec -T app wget -qO- http://127.0.0.1:3000/api/health </dev/null 2>/dev/null || true)
    if [ -n "$raw" ]; then
      # Flatten so a single sed can reach fields in the pretty-printed body.
      flat=$(printf '%s' "$raw" | tr -d '\n ')
      got_ok=$(printf '%s' "$flat" | sed -n 's/.*"ok":\([a-z]*\).*/\1/p')
      got_sha=$(printf '%s' "$flat" | sed -n 's/.*"buildSha":"\([^"]*\)".*/\1/p')
      if [ "$got_ok" = "true" ] && [ "$got_sha" = "$want" ]; then
        return 0
      fi
    fi
    sleep 5
    waited=$((waited + 5))
    log "waiting for healthy… ${waited}s/${HEALTH_TIMEOUT}s"
  done
  return 1
}

NEW_CONTAINER=$($DC ps -q app </dev/null 2>/dev/null || true)
if [ -n "$PREV_CONTAINER" ] && [ "$PREV_CONTAINER" = "$NEW_CONTAINER" ]; then
  rollback "compose did not recreate the app container (still $PREV_CONTAINER)"
fi

log "waiting for /api/health to report $TARGET_SHA"
if ! wait_healthy "$TARGET_SHA"; then
  $DC logs --tail 80 app </dev/null 2>&1 || true
  rollback "health gate timed out after ${HEALTH_TIMEOUT}s"
fi

log "healthy at $TARGET_SHA"
notify "✅ deploy OK" "tokenusage now serving \`${TARGET_SHA}\`
previous: \`${PREV_SHA}\`"
log "done"
exit 0
