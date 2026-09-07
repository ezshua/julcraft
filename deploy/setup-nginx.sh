#!/usr/bin/env bash
# ============================================================
# JulCraft — setup-nginx.sh (Этап 7, T-7.1)
# Устанавливает nginx-конфиг reverse proxy для julcraft.
# Запуск от ubuntu: sudo-команды помечены [sudo].
#
#   bash deploy/setup-nginx.sh [домен]
#   DOMAIN=julcraft.zapto.org bash deploy/setup-nginx.sh
#
# Идемпотентен: повторный запуск обновляет конфиг и перезагружает nginx.
# SSL НЕ настраивает (это deploy/setup-ssl.sh после DNS-записи).
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-${1:-julcraft.zapto.org}}"
CONF_SRC="$(cd "$(dirname "$0")" && pwd)/nginx/julcraft.conf.template"
CONF_DST="/etc/nginx/sites-available/julcraft"
TMP_CONF="$(mktemp)"

log()  { printf '\n==> %s\n' "$*"; }
die()  { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
sudo_step() { printf '  [sudo] %s\n' "$*"; }

[ "$(id -un)" = "ubuntu" ] || die "запускайте от пользователя ubuntu"
[ -f "$CONF_SRC" ] || die "не найден шаблон $CONF_SRC (запускайте из корня репозитория)"

log "1/3. Конфиг: домен ${DOMAIN}"
sed "s/julcraft\.zapto\.org/${DOMAIN}/g" "$CONF_SRC" > "$TMP_CONF"

sudo_step "cp → ${CONF_DST}"
sudo cp "$TMP_CONF" "$CONF_DST"

log "2/3. Включение сайта"
if [ ! -L /etc/nginx/sites-enabled/julcraft ]; then
  sudo_step "ln -s ${CONF_DST} → sites-enabled"
  sudo ln -s "$CONF_DST" /etc/nginx/sites-enabled/julcraft
fi
# дефолтный сайт ловит неописанные Host — убираем, чтобы не мешал
if [ -L /etc/nginx/sites-enabled/default ]; then
  sudo_step "rm sites-enabled/default (дефолтная заглушка)"
  sudo rm /etc/nginx/sites-enabled/default
fi

log "3/3. Проверка и перезагрузка"
sudo_step "nginx -t"
sudo nginx -t
sudo_step "systemctl reload nginx"
sudo systemctl reload nginx

rm -f "$TMP_CONF"

log "Готово: http://${DOMAIN} проксирует на 127.0.0.1:3000."
log "Проверка: curl -sI http://${DOMAIN}  (нужна A-запись DNS → IP этого VPS)."
log "Дальше: bash deploy/setup-ssl.sh <email>  (README-deploy §3.2)"
