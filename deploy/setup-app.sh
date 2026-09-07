#!/usr/bin/env bash
# ============================================================
# JulCraft — setup-app.sh (Этап 7, T-7.1; решения D-20/D-22)
# Разворачивает сайт в /opt/julcraft и запускает под PM2.
# Запуск от пользователя ubuntu (sudo НЕ требуется — права через
# группу www-data + setgid, D-20).
#
#   bash deploy/setup-app.sh <repo-url> [путь-к-снапшоту.zip]
#   REPO_URL=<url> SNAPSHOT=<zip> bash deploy/setup-app.sh
#
# Порядок (D-22: restore ДО build — пререндеры/sitemap читают БД):
#   клон → права (setgid на записываемых местах) → npm ci → .env
#   (пауза, если нет) → snapshot:restore → snapshot:check → build
#   → pm2 start + pm2 save
#
# Идемпотентен: существующие .env/клон/БД не трогает, пропущенные
# шаги доезжает.
# ============================================================
set -euo pipefail

APP_DIR="/opt/julcraft"
SITE_DIR="$APP_DIR/site"
PORT="${PORT:-3000}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
note() { printf '  %s\n' "$*"; }

# ---------- 0. Аргументы и предусловия ----------
REPO_URL="${REPO_URL:-${1:-}}"
SNAPSHOT="${SNAPSHOT:-${2:-}}"

[ "$(id -un)" = "ubuntu" ] || die "запускайте от пользователя ubuntu (сейчас: $(id -un))"
[ -n "$REPO_URL" ] || die "укажите URL репозитория: bash deploy/setup-app.sh <repo-url> [snapshot.zip]"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] || die "nvm не найден — сначала bash deploy/setup-server.sh"
\. "$NVM_DIR/nvm.sh"
command -v node >/dev/null 2>&1 || die "node не в PATH после загрузки nvm"
note "node $(node --version), npm $(npm --version)"

command -v pm2 >/dev/null 2>&1 || die "pm2 не найден — сначала bash deploy/setup-server.sh"

# Группа www-data должна примениться к сессии (новый вход по ssh после
# setup-server.sh). Иначе используем sg для операций с записью.
USE_SG=0
if ! id -nG | grep -qw www-data; then
  USE_SG=1
  note "группа www-data неактивна в этой сессии — операции записи выполню через sg www-data"
fi

# Обёртка: команда с эффективной группой www-data
run_as_wwwdata() {
  if [ "$USE_SG" = "1" ]; then
    sg www-data -c "$*"
  else
    eval "$*"
  fi
}

# ---------- 1. Клонирование ----------
log "1/7. Код: /opt/julcraft"
if [ -d "$SITE_DIR" ] && [ -d "$SITE_DIR/.git" ]; then
  note "клон уже есть — git pull"
  git -C "$APP_DIR" pull --ff-only
elif [ -d "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]; then
  die "$APP_DIR не пуст и не является клоном — разверните вручную (README-deploy §2.1)"
else
  note "git clone $REPO_URL → $APP_DIR"
  # клон пишем с эффективной группой www-data (каталог 2775 www-data:www-data)
  run_as_wwwdata "git clone '$REPO_URL' '$APP_DIR'"
fi
[ -f "$SITE_DIR/package.json" ] || die "в клоне нет $SITE_DIR/package.json — это не репозиторий JulCraft?"

# ---------- 2. Права на записываемые места (D-20) ----------
log "2/7. Права: группа www-data пишет в БД/uploads/.next (setgid)"
# Владелец файлов из клона — ubuntu:ubuntu; переключаем группу на www-data,
# чтобы и сайт (pm2 от ubuntu в группе), и будущие обновления работали.
run_as_wwwdata "chgrp -R www-data '$APP_DIR' 2>/dev/null || true"
mkdir -p "$SITE_DIR/public/uploads/products" \
         "$SITE_DIR/public/uploads/components" \
         "$SITE_DIR/public/uploads/categories" \
         "$SITE_DIR/public/uploads/collages"
run_as_wwwdata "chmod -R g+rwX '$SITE_DIR/public/uploads' '$SITE_DIR/.next' 2>/dev/null || true"
# setgid на записываемых каталогах: новые файлы наследуют группу www-data
find "$SITE_DIR/public/uploads" -type d -exec chmod g+s {} + 2>/dev/null || true
[ -d "$SITE_DIR/.next" ] && { find "$SITE_DIR/.next" -type d -exec chmod g+s {} + 2>/dev/null || true; } || true
note "uploads: $(find "$SITE_DIR/public/uploads" -type f 2>/dev/null | wc -l) файлов"

# ---------- 3. Зависимости ----------
log "3/7. npm ci"
cd "$SITE_DIR"
npm ci

# ---------- 4. .env ----------
log "4/7. .env"
if [ -f "$SITE_DIR/.env" ]; then
  note ".env существует — не трогаю"
else
  cp "$SITE_DIR/.env.example" "$SITE_DIR/.env"
  cat >&2 <<'EOF'

  !!! ТРЕБУЕТСЯ РУЧНОЙ ШАГ !!!
  Создан ЗАГЛУШКА .env из .env.example. Откройте и заполните:

      nano /opt/julcraft/site/.env

  Обязательные прод-значения (см. README-deploy §2.2):
    SITE_URL=https://julcraft.zapto.org
    AUTH_URL=https://julcraft.zapto.org
    ADMIN_LOGIN / ADMIN_PASSWORD  — доступ к /admin
    AUTH_SECRET                   — openssl rand -base64 32
    TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID

  Затем повторно запустите:  bash deploy/setup-app.sh <repo-url>
  (повторный запуск пропустит готовый .env)

EOF
  exit 2
fi

# ---------- 5. Снапшот (D-22: restore ДО build) ----------
log "5/7. Данные: снапшот (вариант Б, основной)"
if [ -f "$SITE_DIR/julcraft.db" ]; then
  note "БД уже существует ($SITE_DIR/julcraft.db) — restore пропускаю"
else
  # артефакт: аргумент, env, /opt/julcraft, /tmp — первый найденный
  SNAP_PATH="$SNAPSHOT"
  if [ -z "$SNAP_PATH" ]; then
    for f in "$APP_DIR"/julcraft-snapshot-*.zip /tmp/julcraft-snapshot-*.zip; do
      if [ -f "$f" ]; then SNAP_PATH="$f"; break; fi
    done
  fi
  if [ -n "$SNAP_PATH" ] && [ -f "$SNAP_PATH" ]; then
    note "restore из $SNAP_PATH"
    npm run snapshot:restore -- "$SNAP_PATH"
  else
    cat >&2 <<'EOF'

  !!! БД отсутствует, снапшот не найден !!!

  Продолжите по README-deploy одним из вариантов:
    Б (основной, D-22): положите julcraft-snapshot-*.zip в /opt/julcraft/
       или /tmp/, затем повторно:  bash deploy/setup-app.sh <repo-url> <zip>
    А (запасной): демо-сид —  npm run db:seed && npm run db:check
       (из /opt/julcraft/site; далее повторный запуск setup-app.sh)

EOF
    exit 2
  fi
fi

# ---------- 6. Проверка + сборка ----------
log "6/7. snapshot:check → build"
npm run snapshot:check
npm run build

# ---------- 7. PM2 ----------
log "7/7. PM2: запуск julcraft"
if pm2 describe julcraft >/dev/null 2>&1; then
  note "приложение уже в PM2 — перезапуск"
  pm2 restart julcraft --update-env
else
  pm2 start "$SITE_DIR/ecosystem.config.cjs"
fi
pm2 save
sleep 3
pm2 ls

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" || true)"
note "curl http://127.0.0.1:${PORT}/ → HTTP ${HTTP_CODE}"
case "$HTTP_CODE" in
  200|301|302|307|308) note "приложение отвечает" ;;
  *) die "неожиданный HTTP-код ${HTTP_CODE} — смотрите pm2 logs julcraft" ;;
esac

log "Готово. Дальше: bash deploy/setup-nginx.sh (см. README-deploy §3)"
