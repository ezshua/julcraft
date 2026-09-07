#!/usr/bin/env bash
# ============================================================
# JulCraft — setup-ssl.sh (Этап 7, T-7.1)
# Сертификат Let's Encrypt через certbot --nginx. Запуск от ubuntu
# ПОСЛЕ того, как A-запись julcraft.zapto.org указывает на IP VPS
# (иначе валидация ACME упадёт — проверка в шаге 0).
#
#   bash deploy/setup-ssl.sh <email> [домен]
#   CERTBOT_EMAIL=you@mail.tld DOMAIN=julcraft.zapto.org bash deploy/setup-ssl.sh
#
# certbot сам допишет ssl-блок в конфиг, включит redirect HTTP→HTTPS.
# Продление автоматическое (systemd-timer certbot); перезапуск nginx — тоже.
# ============================================================
set -euo pipefail

CERTBOT_EMAIL="${CERTBOT_EMAIL:-${1:-}}"
DOMAIN="${DOMAIN:-${2:-julcraft.zapto.org}}"

log()  { printf '\n==> %s\n' "$*"; }
die()  { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
sudo_step() { printf '  [sudo] %s\n' "$*"; }

[ "$(id -un)" = "ubuntu" ] || die "запускайте от пользователя ubuntu"
[ -n "$CERTBOT_EMAIL" ] || die "укажите email для Let's Encrypt: bash deploy/setup-ssl.sh <email> [домен]"

command -v certbot >/dev/null 2>&1 || die "certbot не установлен — bash deploy/setup-server.sh"

log "0/3. Предварительная проверка DNS (по протоколу — не подглядываем чужой IP)"
VPS_IP="$(curl -s https://api.ipify.org || true)"
[ -n "$VPS_IP" ] || die "не удалось определить публичный IP этого VPS (api.ipify.org)"
DOMAIN_IP="$(getent hosts "$DOMAIN" | awk '{print $1; exit}' || true)"
printf '  VPS IP: %s\n  %s → %s\n' "$VPS_IP" "$DOMAIN" "${DOMAIN_IP:-<не резолвится>}"
if [ -z "$DOMAIN_IP" ]; then
  die "домен не резолвится — настройте A-запись на стороне zapto.org (README-deploy §0) и подождите распространения DNS"
fi
if [ "$VPS_IP" != "$DOMAIN_IP" ]; then
  die "A-запись ($DOMAIN_IP) != IP этого VPS ($VPS_IP) — сертификат не выпустится"
fi

log "1/3. certbot --nginx (HTTP-01)"
sudo_step "certbot --nginx -d ${DOMAIN} --redirect --non-interactive --agree-tos -m ${CERTBOT_EMAIL}"
sudo certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos -m "$CERTBOT_EMAIL"

log "2/3. Проверка HTTPS"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://${DOMAIN}" || true)"
printf '  curl https://%s → HTTP %s\n' "$DOMAIN" "$HTTP_CODE"
case "$HTTP_CODE" in
  200|301|302|307|308) : ;;
  *) printf '  WARN: неожиданный код — сайт мог ещё не подняться; проверьте pm2 logs julcraft\n' ;;
esac
REDIR_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://${DOMAIN}" || true)"
printf '  curl http://%s → HTTP %s (ожидается 301)\n' "$DOMAIN" "$REDIR_CODE"

log "3/3. Автопродление"
systemctl list-timers 2>/dev/null | grep -q certbot || true
CERTBOT_DRY="$(sudo certbot renew --dry-run 2>&1 | tail -n3 || true)"
printf '  certbot renew --dry-run:\n%s\n' "$CERTBOT_DRY"

log "Готово: https://${DOMAIN}"
log "Дальше (если ещё не): .env SITE_URL/AUTH_URL=https://${DOMAIN} + pm2 restart julcraft --update-env (README-deploy §3.3)"
