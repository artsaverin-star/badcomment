#!/usr/bin/env bash
# Deploy a CI-built commit of main to the Kazakhstan VM (inapp.pro since 2026-10-11).
#
#   bash deploy/deploy-kz.sh [<40-char sha>]     # default: origin/main
#
# Pushing to main no longer deploys (repo variable DEPLOY_ENABLED=false): the VM keeps port 22
# closed, and GitHub runners have changing IPs. CI still builds .next on every push; this script
# downloads that artifact (kept 2 days; for an older commit: gh workflow run deploy.yml --ref main),
# opens SSH for this Mac only (deploy/kz_ssh.py), and runs the commit's own deploy/deploy.sh on the
# box as user `badcomment` — the same swap-in, DB backup and rollback as before.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=artsaverin-star/badcomment
die() { echo "!! $*" >&2; exit 1; }

git fetch --quiet origin main
SHA="${1:-$(git rev-parse origin/main)}"
[[ "${SHA}" =~ ^[0-9a-f]{40}$ ]] || die "need a full 40-char sha, got '${SHA}'"

RUN_ID="$(gh run list -R "${REPO}" --workflow deploy.yml --branch main --status success --limit 30 \
  --json databaseId,headSha --jq "map(select(.headSha == \"${SHA}\"))[0].databaseId // empty")"
[[ -n "${RUN_ID}" ]] || die "no successful CI run for ${SHA}; run: gh workflow run deploy.yml -R ${REPO} --ref main"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
echo ">> downloading next-build from run ${RUN_ID}"
gh run download "${RUN_ID}" -R "${REPO}" -n next-build -D "${TMP}" \
  || die "artifact expired; rebuild: gh workflow run deploy.yml -R ${REPO} --ref main"
[[ "$(tar -xzOf "${TMP}/next-build.tgz" .next/DEPLOY_COMMIT)" == "${SHA}" ]] || die "artifact is not from ${SHA}"

python3 deploy/kz_ssh.py --put "${TMP}/next-build.tgz:/tmp/inapp-next-build.tgz" -- sudo bash -s -- "${SHA}" <<'REMOTE'
set -euo pipefail
sha="$1"
cd /opt/badcomment
install -o badcomment -g badcomment -m 644 /tmp/inapp-next-build.tgz next-build.tgz
rm -f /tmp/inapp-next-build.tgz
sudo -u badcomment -H git fetch --quiet origin +refs/heads/main:refs/remotes/origin/main
script="$(mktemp)"
trap 'rm -f "$script"' EXIT
sudo -u badcomment git show "${sha}:deploy/deploy.sh" > "$script"
chmod 644 "$script"
sudo -u badcomment -H bash "$script" "$sha" < /dev/null
REMOTE

echo ">> checking the site through the box"
for path in /en/segment /ru/rating /ru/tokens; do
  # https once the inapp.pro certificate is on the box, plain http to the box before that
  if code="$(curl -fs -o /dev/null -w '%{http_code}' --max-time 60 --resolve inapp.pro:443:94.131.83.228 "https://inapp.pro${path}")"; then
    echo "   https ${path} -> ${code}"
  else
    echo "   http  ${path} -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 60 -H 'Host: inapp.pro' "http://94.131.83.228${path}")"
  fi
done
