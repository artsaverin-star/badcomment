#!/usr/bin/env bash
# One-time provisioning for a fresh Ubuntu 24.04 VM.
# Run as a sudo-capable user (e.g. ubuntu). Usage: bash setup.sh
set -euo pipefail

APP_DIR=/opt/badcomment
REPO=https://github.com/artsaverin-star/badcomment.git

echo ">> Installing Node.js 20 LTS, nginx, certbot, git..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git

echo ">> Cloning repo into ${APP_DIR}..."
sudo mkdir -p "${APP_DIR}"
sudo chown "$USER":"$USER" "${APP_DIR}"
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO}" "${APP_DIR}"
fi
cd "${APP_DIR}"
mkdir -p data

echo ">> Installing dependencies and building..."
npm ci
export DATABASE_URL="file:${APP_DIR}/data/prod.db"
npx prisma generate
npx prisma db push
npm run build

echo ">> Installing systemd service (running as ${USER})..."
sed "s/^User=.*/User=${USER}/" deploy/badcomment.service | sudo tee /etc/systemd/system/badcomment.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now badcomment

echo ">> Installing nginx site..."
sudo cp deploy/nginx-badcomment.conf /etc/nginx/sites-available/badcomment
sudo ln -sf /etc/nginx/sites-available/badcomment /etc/nginx/sites-enabled/badcomment
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">> Done. App should be live on http://<server-ip>"
echo ">> Next: point badcomment.pro DNS A-record to this server, then run:"
echo "   sudo certbot --nginx -d badcomment.pro -d www.badcomment.pro"
