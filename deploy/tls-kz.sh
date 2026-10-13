#!/usr/bin/env bash
# HTTPS for inapp.pro on the Yandex Cloud KZ VM: issue (or keep) the Let's Encrypt certificate
# and install deploy/nginx-badcomment.conf as the live site. Run from the Mac once DNS for
# inapp.pro and www.inapp.pro points at the VM, and again after editing the nginx file:
#
#   python3 deploy/kz_ssh.py --put deploy/nginx-badcomment.conf:/tmp/inapp-nginx.conf -- sudo bash -s < deploy/tls-kz.sh
#
# Uses Roomdo's certbot (/opt/roomdo-certbot) and its account; its 6-hourly `certbot renew`
# timer renews this certificate too, and the shared deploy hook reloads nginx.
# If the new nginx config fails `nginx -t`, the previous one is put back.
set -euo pipefail

CERTBOT=/opt/roomdo-certbot/bin/certbot
WEBROOT=/var/www/inapp-acme
SITE=/etc/nginx/sites-available/inapp.pro
NEW=/tmp/inapp-nginx.conf
log() { echo ">> $*"; }

[[ $EUID -eq 0 ]] || { echo "run as root (sudo bash -s)"; exit 1; }
[[ -f "${NEW}" ]] || { echo "${NEW} missing: pass it with --put deploy/nginx-badcomment.conf:${NEW}"; exit 1; }

if [[ ! -f /etc/letsencrypt/live/inapp.pro/fullchain.pem ]]; then
  # Check first, from the Mac, that the zone's own servers already answer with this VM:
  #   dig +short inapp.pro www.inapp.pro @ns1.reg.ru     (this VM's resolver may cache the old IP for a day)
  # Here: nginx serves the challenge webroot for both names.
  probe="probe-$(date +%s)"
  install -d -m 755 "${WEBROOT}/.well-known/acme-challenge"
  echo "${probe}" > "${WEBROOT}/.well-known/acme-challenge/${probe}"
  for host in inapp.pro www.inapp.pro; do
    got="$(curl -s --max-time 15 --resolve "${host}:80:127.0.0.1" "http://${host}/.well-known/acme-challenge/${probe}" || true)"
    if [[ "${got}" != "${probe}" ]]; then
      rm -f "${WEBROOT}/.well-known/acme-challenge/${probe}"
      echo "!! nginx does not serve the ACME webroot for ${host}"; exit 1
    fi
  done
  rm -f "${WEBROOT}/.well-known/acme-challenge/${probe}"
  log "issuing the certificate for inapp.pro, www.inapp.pro"
  "${CERTBOT}" certonly --non-interactive --webroot -w "${WEBROOT}" \
    --cert-name inapp.pro -d inapp.pro -d www.inapp.pro --key-type ecdsa
fi

log "installing ${SITE}"
cp -a "${SITE}" "${SITE}.prev"
install -m 644 "${NEW}" "${SITE}"
rm -f "${NEW}"
if ! nginx -t 2>/dev/null; then
  mv "${SITE}.prev" "${SITE}"
  nginx -t || true
  echo "!! new nginx config rejected; previous one restored"; exit 1
fi
systemctl reload nginx
rm -f "${SITE}.prev"
log "done"
for url in https://inapp.pro/en/segment https://www.inapp.pro/ http://inapp.pro/ru/rating https://94.131.83.228/health; do
  echo "   ${url} -> $(curl -sk -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 --resolve inapp.pro:443:127.0.0.1 --resolve www.inapp.pro:443:127.0.0.1 "${url}")"
done
