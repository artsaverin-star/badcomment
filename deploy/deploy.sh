#!/usr/bin/env bash
# Update an already-provisioned VM to the latest main. Run from /opt/badcomment.
#
# This box has 2GB RAM, which OOM-kills `next build` (and the half-finished build
# corrupts the live .next). So we do NOT build here: the GitHub Actions runner
# builds .next, ships it as next-build.tgz, and this script just swaps it in.
set -euo pipefail

APP_DIR=/opt/badcomment
cd "${APP_DIR}"

export DATABASE_URL="file:${APP_DIR}/data/prod.db"

if [[ ! -f next-build.tgz ]]; then
  echo "!! next-build.tgz not found — the workflow must scp it here first." >&2
  exit 1
fi

# Light steps only (cheap on RAM): source, deps, prisma. No build.
git pull --ff-only origin main
npm ci
npx prisma generate
npx prisma db push --accept-data-loss

# Unpack the runner-built .next into a staging dir, then swap atomically so a
# bad transfer can never leave the live server reading a half-written .next.
rm -rf .next.incoming
mkdir -p .next.incoming
tar -xzf next-build.tgz -C .next.incoming
rm -rf .next.old
mv .next .next.old 2>/dev/null || true
mv .next.incoming/.next .next
rm -rf .next.incoming .next.old next-build.tgz

sudo systemctl restart badcomment
echo ">> Deployed (prebuilt .next). Status:"
sudo systemctl --no-pager status badcomment | head -n 5
