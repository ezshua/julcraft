#!/usr/bin/env bash
# ============================================================
# JulCraft — snapshot-backup.sh (Этап 7, T-7.2; решение D-21)
# Cron-обвязка snapshot:capture с ротацией. Запуск от ubuntu, БЕЗ sudo.
#
#   deploy/backup/snapshot-backup.sh daily    # хранить 7 артефактов
#   deploy/backup/snapshot-backup.sh weekly  # хранить 4 артефакта
#
# Что делает:
#   1. npm run snapshot:capture в /opt/julcraft/site
#   2. перемещает артефакт в /opt/julcraft/backups/<daily|weekly>/
#   3. ротация по штампу ДАТЫ В ИМЕНИ файла (не mtime):
#      ежедневные — свежие 7, еженедельные — свежие 4
#   4. лог (env BACKUP_LOG, по умолчанию
#      /opt/julcraft/backups/backup.log — /var/log недоступен без sudo,
#      отклонение от D-21, см. README-deploy §4) + контроль размера du
#
# БД копируется через sqlite.backup() — приложение МОЖЕТ работать;
# ночное окно (03:30/04:00 по crontab) выбрано ради тишины и малого WAL.
# ============================================================
set -euo pipefail

KIND="${1:-daily}"
SITE_DIR="/opt/julcraft/site"
BACKUP_ROOT="/opt/julcraft/backups"
BACKUP_LOG="${BACKUP_LOG:-$BACKUP_ROOT/backup.log}"

case "$KIND" in
  daily)   KEEP=7 ;;
  weekly) KEEP=4 ;;
  *) printf 'использование: %s daily|weekly\n' "$0" >&2; exit 64 ;;
esac

log() { printf '[%s] [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$KIND" "$*"; }

[ -d "$SITE_DIR" ] || { log "ОШИБКА: нет $SITE_DIR"; exit 1; }
mkdir -p "$BACKUP_ROOT/$KIND"

log "=== старт: snapshot:capture ==="
cd "$SITE_DIR"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" || true
command -v npm >/dev/null 2>&1 || { log "ОШИБКА: npm не в PATH (nvm)"; exit 1; }

if ! npm run snapshot:capture >>"$BACKUP_LOG" 2>&1; then
  log "ОШИБКА: snapshot:capture провалился — детали в $BACKUP_LOG"
  exit 1
fi

# свежесозданный артефакт — в каталог каденции
ARTIFACT="$(ls -1t julcraft-snapshot-*.zip 2>/dev/null | head -n1 || true)"
[ -n "$ARTIFACT" ] || { log "ОШИБКА: артефакт не найден после capture"; exit 1; }
DEST_DIR="$BACKUP_ROOT/$KIND"
mv "$ARTIFACT" "$DEST_DIR/"
log "артефакт: $DEST_DIR/$(basename "$ARTIFACT")"

# ---------- ротация по дате в имени (julcraft-snapshot-YYYY-MM-DD-HHmm.zip) ----------
# сортировка лексикографическая по имени = хронологическая по штампу
ROTATED=0
cd "$DEST_DIR"
# shellcheck disable=SC2012
COUNT="$(ls -1 julcraft-snapshot-*.zip 2>/dev/null | wc -l)"
if [ "$COUNT" -gt "$KEEP" ]; then
  # shellcheck disable=SC2012
  ls -1 julcraft-snapshot-*.zip | sort -r | tail -n +"$((KEEP + 1))" | while read -r OLD; do
    rm -f "$OLD"
    ROTATED=1
    log "ротация: удалён $OLD"
  done
fi
log "в $KIND хранится $(ls -1 julcraft-snapshot-*.zip 2>/dev/null | wc -l) из $KEEP артефактов"

# ---------- контроль размера ----------
DU="$(du -sh "$BACKUP_ROOT" | cut -f1)"
TOTAL="$(find "$BACKUP_ROOT" -name 'julcraft-snapshot-*.zip' | wc -l)"
log "итог: всего $TOTAL артефактов, /opt/julcraft/backups занимает $DU"
log "=== завершён ==="
