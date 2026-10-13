#!/usr/bin/env bash
# One-time (idempotent) provisioning of inapp.pro on the Kazakhstan VM that also runs Roomdo
# (roomdo-v2-service-kz, 94.131.83.228, 2 vCPU 20%, 2 GB RAM). Moved here on 2026-10-11 after the
# Yandex Cloud Vladimir data centre (ru-central1-a) went down with the old box.
#
# Run from the Mac:
#   python3 deploy/kz_ssh.py -- sudo bash -s < deploy/setup-kz.sh
#
# What it sets up (nothing of Roomdo's is touched; nginx is reloaded only if `nginx -t` passes):
#   - 2 GB swap (the box had none; npm ci + Next next to Roomdo needs headroom)
#   - system user `badcomment`, checkout of the public repo in /opt/badcomment, data/ for SQLite
#   - /opt/badcomment/.env with a fresh SESSION_SECRET (other secrets are added by hand, see below)
#   - systemd unit `badcomment` on port 3000 (closed outside by the security group) with a
#     memory cap, so it can't starve Roomdo (the site runs at ~320 MB, src/lib/dataFile.ts)
#   - systemd unit `inappbot` for the Telegram login bot (starts once TELEGRAM_BOT_TOKEN is in .env)
#   - sudo rule so deploy.sh (run as `badcomment`) can restart only its own units
#   - a bootstrap nginx site for inapp.pro on port 80 + ACME webroot; once DNS points here,
#     deploy/tls-kz.sh issues the certificate and installs deploy/nginx-badcomment.conf
#
# Secrets that only lived in the old box's .env must be appended to /opt/badcomment/.env by hand
# (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, TELEGRAM_BOT_TOKEN, …), then `sudo systemctl restart badcomment`.
set -euo pipefail

APP_DIR=/opt/badcomment
REPO=https://github.com/artsaverin-star/badcomment.git
NODE=/usr/local/bin/node
log() { echo ">> $*"; }

[[ $EUID -eq 0 ]] || { echo "run as root (sudo bash -s)"; exit 1; }

# 1. Swap.
if ! swapon --show --noheadings | grep -q .; then
  log "creating 2G swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/90-inapp-swap.conf
  sysctl -q -p /etc/sysctl.d/90-inapp-swap.conf
fi

# 2. User and checkout.
id badcomment >/dev/null 2>&1 \
  || useradd --system --home-dir /var/lib/badcomment --create-home --shell /usr/sbin/nologin badcomment
if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "cloning ${REPO} into ${APP_DIR}"
  install -d -o badcomment -g badcomment -m 755 "${APP_DIR}"
  sudo -u badcomment -H git clone --quiet --filter=blob:none --branch main "${REPO}" "${APP_DIR}"
fi
install -d -o badcomment -g badcomment -m 700 "${APP_DIR}/data"

# 3. Runtime env. Only created once: never overwrite secrets added by hand.
if [[ ! -f "${APP_DIR}/.env" ]]; then
  log "creating ${APP_DIR}/.env with a new SESSION_SECRET"
  install -o badcomment -g badcomment -m 600 /dev/null "${APP_DIR}/.env"
  {
    echo "SESSION_SECRET=$(openssl rand -hex 32)"
    echo "SITE_URL=https://inapp.pro"
    echo "GOOGLE_CLIENT_ID=1013938839617-684p1fd5ue8ocv04541otvibnshmv5b7.apps.googleusercontent.com"
    echo "BOT_USERNAME=inAppProBot"
  } >> "${APP_DIR}/.env"
fi

# 4. systemd unit (started by the first deploy, once node_modules and .next exist).
cat > /etc/systemd/system/badcomment.service <<UNIT
[Unit]
Description=inapp.pro (Next.js, github.com/artsaverin-star/badcomment)
After=network.target

[Service]
Type=simple
User=badcomment
Group=badcomment
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=file:${APP_DIR}/data/prod.db
# An explicit heap: Node otherwise sizes it from the cgroup limit. Measured: ~320 MB steady,
# 485 MB peak while a big data file is split once after it changes (src/lib/dataFile.ts).
Environment=NODE_OPTIONS=--max-old-space-size=512
EnvironmentFile=-${APP_DIR}/.env
# No -H: with "-H 127.0.0.1" Next builds rewrite URLs on "localhost", treats proxy.ts rewrites
# as external and answers 307/500. Port 3000 is closed by the VM's security group (80/443 only).
ExecStart=${NODE} ${APP_DIR}/node_modules/next/dist/bin/next start -p 3000
Restart=always
RestartSec=5
# Shares the box with Roomdo: cap memory so a leak here can't take Roomdo down.
MemoryHigh=650M
MemoryMax=900M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --quiet badcomment.service

# 4b. The Telegram bot @inAppProBot (bot/bot.mjs): binds "Login with Telegram" on the site
# through the shared prod.db. Long-polls Telegram; needs TELEGRAM_BOT_TOKEN in .env and is
# started once it is there (deploy.sh restarts it after every deploy).
cat > /etc/systemd/system/inappbot.service <<UNIT
[Unit]
Description=inapp.pro Telegram bot @inAppProBot (web login binding), bot/bot.mjs
After=network.target badcomment.service

[Service]
Type=simple
User=badcomment
Group=badcomment
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:${APP_DIR}/data/prod.db
Environment=SITE_URL=https://inapp.pro
Environment=NODE_OPTIONS=--max-old-space-size=96
EnvironmentFile=${APP_DIR}/.env
ExecStart=${NODE} ${APP_DIR}/bot/bot.mjs
Restart=always
RestartSec=10
# Shares the box with Roomdo (the bot runs at ~35 MB).
MemoryMax=200M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --quiet inappbot.service
if grep -q '^TELEGRAM_BOT_TOKEN=.' "${APP_DIR}/.env"; then systemctl restart inappbot.service; fi

# 5. deploy.sh runs as `badcomment` and restarts only its own units.
cat > /etc/sudoers.d/badcomment-deploy <<'SUDO'
badcomment ALL=(root) NOPASSWD: /usr/bin/systemctl restart badcomment, /usr/bin/systemctl restart inappbot, /usr/bin/systemctl --no-pager status badcomment
SUDO
chmod 440 /etc/sudoers.d/badcomment-deploy
visudo -cqf /etc/sudoers.d/badcomment-deploy || { rm -f /etc/sudoers.d/badcomment-deploy; echo "bad sudoers rule"; exit 1; }

# 6. nginx: HTTP site from the repo's reference config + ACME webroot. Roomdo keeps default_server.
install -d -m 755 /var/www/inapp-acme
SITE=/etc/nginx/sites-available/inapp.pro
if [[ ! -f "${SITE}" ]]; then
  # HTTP-only bootstrap until deploy/tls-kz.sh has a certificate and installs
  # deploy/nginx-badcomment.conf over it.
  log "installing bootstrap nginx site ${SITE}"
  cat > "${SITE}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name inapp.pro www.inapp.pro;
    location ^~ /.well-known/acme-challenge/ { root /var/www/inapp-acme; }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
  ln -sf "${SITE}" /etc/nginx/sites-enabled/inapp.pro
  if ! nginx -t 2>/dev/null; then
    rm -f /etc/nginx/sites-enabled/inapp.pro
    nginx -t
    echo "nginx config rejected; site disabled"; exit 1
  fi
  systemctl reload nginx
fi

log "done"
free -m | sed -n '1,3p'
df -h / | tail -1
