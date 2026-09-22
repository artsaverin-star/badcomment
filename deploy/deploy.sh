#!/usr/bin/env bash
# Deploy exactly one commit (the one CI built) to the already-provisioned VM.
#
#   bash deploy.sh <40-char commit sha>
#
# .github/workflows/deploy.yml runs this file as it is IN THAT COMMIT
# (`git show <sha>:deploy/deploy.sh`), not the copy in the box's current checkout,
# so a change here takes effect on the same deploy. Manual equivalent on the box
# (next-build.tgz for that commit must already be in /opt/badcomment):
#   cd /opt/badcomment && git fetch origin main \
#     && git show <sha>:deploy/deploy.sh > /tmp/deploy.sh && bash /tmp/deploy.sh <sha>
#
# This box has 2GB RAM, which OOM-kills `next build` (and the half-finished build
# corrupts the live .next). So we do NOT build here: the GitHub Actions runner
# builds .next, ships it as next-build.tgz, and this script just swaps it in.
#
# Order (nothing the running server reads changes before step 3; if anything fails
# before the new .next is in place, the checkout, node_modules and Prisma client go
# back to the previous commit):
#   1. check <sha> is on origin/main; unpack next-build.tgz into a staging dir and
#      check it was built from <sha>
#   2. back up the SQLite DB into data/backups/ (the newest KEEP_BACKUPS are kept)
#   3. check out <sha>; `npm ci` only if package-lock.json or node changed
#   4. prisma generate + db push WITHOUT --accept-data-loss: a destructive schema
#      change now fails the deploy instead of silently dropping data
#   5. swap .next in and restart
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/badcomment}"   # overridable only to rehearse on a copy
KEEP_BACKUPS=5
DB_FILE="${APP_DIR}/data/prod.db"
BACKUP_DIR="${APP_DIR}/data/backups"
# A backup must never take the disk the live DB needs to keep writing.
DISK_RESERVE_KB=$((512 * 1024))
DEPS_STAMP=node_modules/.deploy-deps-sha256

log() { echo ">> $*"; }
die() { echo "!! $*" >&2; exit 1; }

SHA="${1:-}"
[[ "${SHA}" =~ ^[0-9a-f]{40}$ ]] \
  || die "usage: deploy/deploy.sh <full 40-char commit sha built by CI> (got '${SHA}')"

cd "${APP_DIR}"
export DATABASE_URL="file:${DB_FILE}"

[[ -f next-build.tgz ]] || die "next-build.tgz not found — the workflow must scp it here first."

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum; else shasum -a 256; fi | cut -d' ' -f1
}

# npm ci wipes and reinstalls node_modules (slow, RAM-hungry, and the running server
# loses its modules meanwhile), so only run it when the lockfile or node changed.
# npm ci deletes node_modules first, so a failed install leaves no stamp behind.
install_deps() {
  local want
  want="$({ node --version; cat package-lock.json; } | sha256)"
  if [[ -d node_modules && "$(cat "${DEPS_STAMP}" 2>/dev/null || true)" == "${want}" ]]; then
    log "package-lock.json and node unchanged — skipping npm ci"
    return 0
  fi
  log "npm ci (package-lock.json or node changed)"
  # Explicit return: the rollback calls this with errexit off.
  npm ci --no-audit --no-fund || return
  printf '%s\n' "${want}" > "${DEPS_STAMP}"
}

# Backups are named prod-<UTC time>-<sha12>.db, so name order = age order.
prune_backups() {
  local keep=$1 f i excess
  local -a all=()
  for f in "${BACKUP_DIR}"/prod-*.db; do
    if [[ -f "${f}" ]]; then all+=("${f}"); fi
  done
  excess=$(( ${#all[@]} - keep ))
  for (( i = 0; i < excess; i++ )); do
    log "removing old DB backup ${all[i]}"
    rm -f -- "${all[i]}"
  done
}

backup_db() {
  if [[ ! -f "${DB_FILE}" ]]; then
    log "no database at ${DB_FILE} yet — nothing to back up"
    return 0
  fi
  mkdir -p "${BACKUP_DIR}"
  rm -f "${BACKUP_DIR}"/*.partial
  # Make room for this one first, so the space check below counts the freed file.
  prune_backups $(( KEEP_BACKUPS - 1 ))

  local db_kb wal_kb=0 avail_kb dest tmp
  db_kb="$(du -k "${DB_FILE}" | cut -f1)"
  if [[ -f "${DB_FILE}-wal" ]]; then wal_kb="$(du -k "${DB_FILE}-wal" | cut -f1)"; fi
  avail_kb="$(df -Pk "${BACKUP_DIR}" | awk 'NR == 2 { print $4 }')"
  if (( avail_kb < db_kb + wal_kb + DISK_RESERVE_KB )); then
    die "not enough disk for a DB backup: ${avail_kb} KB free, need $(( db_kb + wal_kb )) KB + ${DISK_RESERVE_KB} KB reserve. Free some space (e.g. ${BACKUP_DIR}) and re-run."
  fi

  dest="${BACKUP_DIR}/prod-$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:12}.db"
  tmp="${dest}.partial"
  # Both methods take a consistent snapshot while the service keeps running
  # (a plain cp of a live SQLite file is not safe).
  if command -v sqlite3 >/dev/null 2>&1; then
    log "backing up the DB (sqlite3 .backup) -> ${dest}"
    sqlite3 -bail -cmd ".timeout 15000" "${DB_FILE}" ".backup '${tmp}'"
  else
    log "sqlite3 not installed (sudo apt-get install -y sqlite3); backing up with VACUUM INTO via prisma -> ${dest}"
    printf "VACUUM INTO '%s';\n" "${tmp}" | npx prisma db execute --url "${DATABASE_URL}" --stdin
  fi
  [[ "$(head -c 15 "${tmp}" 2>/dev/null || true)" == "SQLite format 3" ]] \
    || die "DB backup ${tmp} is missing or not an SQLite file"
  mv -- "${tmp}" "${dest}"
  BACKUP_FILE="${dest}"
  log "DB backup done: ${dest} ($(du -h "${dest}" | cut -f1))"
}

PREV_SHA=""
BACKUP_FILE=""
ROLLBACK=0
on_exit() {
  local rc=$?
  rm -rf .next.incoming
  if (( rc == 0 || ROLLBACK == 0 )); then return; fi
  set +e
  echo "!! deploy of ${SHA} failed (exit ${rc}); restoring the previous commit ${PREV_SHA}" >&2
  if [[ ! -d .next && -d .next.old ]]; then mv .next.old .next; fi
  if git checkout --quiet -B main "${PREV_SHA}" && install_deps && npx prisma generate >/dev/null; then
    echo "!! source, node_modules and the Prisma client are back at ${PREV_SHA}; the service was not restarted." >&2
  else
    echo "!! ROLLBACK FAILED — fix ${APP_DIR} by hand (git checkout -B main ${PREV_SHA}; npm ci; npx prisma generate)." >&2
  fi
  if [[ -n "${BACKUP_FILE}" ]]; then
    echo "!! DB backup taken before this deploy: ${BACKUP_FILE}" >&2
  fi
}
trap on_exit EXIT

# 1. Verify the commit and the build before touching anything live.
git fetch --quiet origin +refs/heads/main:refs/remotes/origin/main
git cat-file -e "${SHA}^{commit}" 2>/dev/null \
  || die "commit ${SHA} is not on the box after fetching origin/main"
git merge-base --is-ancestor "${SHA}" refs/remotes/origin/main \
  || die "commit ${SHA} is not on origin/main — refusing to deploy it"

# Unpack into a staging dir first, so a bad transfer can never leave the live server
# reading a half-written .next.
rm -rf .next.incoming
mkdir -p .next.incoming
tar -xzf next-build.tgz -C .next.incoming
[[ -f .next.incoming/.next/BUILD_ID ]] || die "next-build.tgz has no .next/BUILD_ID"
BUILT_SHA="$(cat .next.incoming/.next/DEPLOY_COMMIT 2>/dev/null || true)"
[[ "${BUILT_SHA}" == "${SHA}" ]] \
  || die "next-build.tgz was built from '${BUILT_SHA:-unknown}', not ${SHA}"

# 2. Back up the DB before anything can change its schema.
backup_db

# 3. Source and deps at exactly ${SHA}. Light steps only (cheap on RAM), no build.
PREV_SHA="$(git rev-parse HEAD)"
ROLLBACK=1
git checkout --quiet -B main "${SHA}"
install_deps

# 4. Prisma client + schema.
npx prisma generate
npx prisma db push --skip-generate

# 5. Swap in the runner-built .next and restart.
rm -rf .next.old
if [[ -d .next ]]; then mv .next .next.old; fi
mv .next.incoming/.next .next
ROLLBACK=0
rm -rf .next.incoming .next.old next-build.tgz

sudo systemctl restart badcomment
# Restart the Telegram bot too so bot/bot.mjs changes go live (no-op if absent).
sudo systemctl restart inappbot 2>/dev/null || true
echo ">> Deployed ${SHA} (prebuilt .next). Status:"
sudo systemctl --no-pager status badcomment | head -n 5 || true
