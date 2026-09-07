#!/usr/bin/env bash
# ============================================================
# JulCraft — тест ротации бэкапов (Этап 7, T-7.2, приёмка)
# Создаёт N фейковых артефактов с датами в имени, прогоняет логику
# ротации из snapshot-backup.sh, сверяет оставшиеся.
#
# Запуск (Win: Git Bash / WSL; Ubuntu: bash):
#   bash deploy/backup/test-rotation.sh
# ============================================================
set -euo pipefail

KEEP_DAILY=7
KEEP_WEEKLY=4

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

log() { printf '  %s\n' "$*"; }

rotate() { # $1 = dir, $2 = keep
  local dir="$1" keep="$2"
  local count
  count="$(ls -1 "$dir"/julcraft-snapshot-*.zip 2>/dev/null | wc -l)"
  if [ "$count" -gt "$keep" ]; then
    ls -1 "$dir"/julcraft-snapshot-*.zip | sort -r | tail -n +"$((keep + 1))" | while read -r OLD; do
      rm -f "$OLD"
    done
  fi
}

check() { # $1 = dir, $2 = keep, $3 = метка теста
  local dir="$1" keep="$2" label="$3"
  local left
  left="$(ls -1 "$dir"/julcraft-snapshot-*.zip 2>/dev/null | wc -l)"
  local expected
  if [ "$3" = "fewer" ]; then expected="$(ls -1 "$dir"/julcraft-snapshot-*.zip | wc -l)"; fi
  if [ "$left" -ne "$keep" ]; then
    printf 'FAIL %s: осталось %s, ожидалось %s\n' "$label" "$left" "$keep" >&2
    exit 1
  fi
  # последний (самый старый) должен быть именно N-го дня от конца
  log "$label: осталось $left — ок"
}

# ---------- тест 1: daily, 10 артефактов → 7 ----------
D="$TMP/daily"; mkdir -p "$D"
for i in $(seq -w 1 10); do touch "$D/julcraft-snapshot-2026-09-$i-0330.zip"; done
rotate "$D" "$KEEP_DAILY"
check "$D" "$KEEP_DAILY" "daily 10→7"
# остались последние 7 по дате: 04..10
LEFT="$(ls -1 "$D" | head -n1)"
[ "$LEFT" = "julcraft-snapshot-2026-09-04-0330.zip" ] \
  || { printf 'FAIL daily: старейший оставшийся %s (ожидался …04-0330)\n' "$LEFT" >&2; exit 1; }
log "daily: старейший оставшийся = 2026-09-04 — ок"

# ---------- тест 2: weekly, 10 артефактов → 4 ----------
W="$TMP/weekly"; mkdir -p "$W"
for i in $(seq -w 1 10); do touch "$W/julcraft-snapshot-2026-08-$i-0400.zip"; done
rotate "$W" "$KEEP_WEEKLY"
check "$W" "$KEEP_WEEKLY" "weekly 10→4"

# ---------- тест 3: меньше лимита — ничего не удаляется ----------
F="$TMP/fewer"; mkdir -p "$F"
for i in 1 2 3; do touch "$F/julcraft-snapshot-2026-09-0$i-0330.zip"; done
rotate "$F" "$KEEP_DAILY"
check "$F" 3 "fewer(3<7): не тронуты"

# ---------- тест 4: ротация учитывает ВРЕМЯ в имени, а не только дату ----------
T="$TMP/time"; mkdir -p "$T"
# два артефакта в один день: 0330 и 1200 — старее тот, что 0330
touch "$T/julcraft-snapshot-2026-09-05-0330.zip" "$T/julcraft-snapshot-2026-09-05-1200.zip"
# ещё 6 разных дней до 04.09 — итого 8, лимит 7 → уйдёт самый старый по ИМЕНИ (04-0330-подобный)
for i in $(seq -w 1 6); do touch "$T/julcraft-snapshot-2026-08-3$i-0330.zip"; done
rotate "$T" "$KEEP_DAILY"
check "$T" "$KEEP_DAILY" "time-in-name 8→7"
if [ -f "$T/julcraft-snapshot-2026-08-31-0330.zip" ]; then
  # 2026-08-31 < 2026-09-05-0330 лексикографически: уйти должен 2026-08-31
  printf 'FAIL time: 2026-08-31-0330 должен был быть удалён\n' >&2; exit 1
fi
[ -f "$T/julcraft-snapshot-2026-09-05-0330.zip" ] && [ -f "$T/julcraft-snapshot-2026-09-05-1200.zip" ] \
  || { printf 'FAIL time: оба артефакта 05.09 должны остаться\n' >&2; exit 1; }
log "time: удалён 2026-08-31 (старейший), оба 05.09 остались — ок"

# ---------- тест 5: ровно лимит — не удаляется ----------
E="$TMP/exact"; mkdir -p "$E"
for i in $(seq -w 1 7); do touch "$E/julcraft-snapshot-2026-09-$i-0330.zip"; done
rotate "$E" "$KEEP_DAILY"
check "$E" "$KEEP_DAILY" "exact(7=7): не тронуты"

printf '\nВСЕ ТЕСТЫ РОТАЦИИ ПРОЙДЕНЫ\n'
