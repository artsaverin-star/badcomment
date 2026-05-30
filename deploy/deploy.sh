#!/usr/bin/env bash
# Update an already-provisioned VM to the latest main. Run from /opt/badcomment.
set -euo pipefail

APP_DIR=/opt/badcomment
cd "${APP_DIR}"

export DATABASE_URL="file:${APP_DIR}/data/prod.db"

git pull --ff-only origin main
npm ci
npx prisma generate
npx prisma db push --accept-data-loss
npm run build
sudo systemctl restart badcomment
echo ">> Deployed. Status:"
sudo systemctl --no-pager status badcomment | head -n 5
