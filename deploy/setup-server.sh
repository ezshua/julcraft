#!/usr/bin/env bash
# ============================================================
# JulCraft — setup-server.sh (Этап 7, T-7.1; решения D-15/D-20)
# Первичная подготовка VPS Ubuntu 24.04 (Oracle Cloud) — запускать
# ОДИН РАЗ на чистом сервере от пользователя ubuntu.
#
# Что делает (все sudo-команды идут отдельными помеченными шагами):
#   1. apt: nginx, git, cron, certbot + python3-certbot-nginx
#   2. группа/права: ubuntu → www-data, /opt/julcraft (www-data:www-data + setgid)
#   3. Node LTS через nvm (под ubuntu, БЕЗ sudo)
#   4. PM2 глобально + автозапуск через systemd (одно sudo из вывода pm2 startup)
#
# Файрвол: OCI ingress (80/443) настраивается в консоли Oracle;
# локальный ufw — опционально, см. README-deploy §1.4.
#
# Идемпотентен: повторный запуск не ломает существующее.
# ============================================================
set -euo pipefail

APP_DIR="/opt/julcraft"
NVM_VER="v0.40.3"          # актуальная версия nvm: https://github.com/nvm-sh/nvm/releases
NODE_MAJOR_LTS="22"        # Node 22 LTS (актуален на 2026-09; проверьте перед запуском)

log()  { printf '\n==> %s\n' "$*"; }
die()  { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
sudo_step() { printf '  [sudo] %s\n' "$*"; }

# ---------- 0. Предусловия ----------
[ "$(id -un)" = "ubuntu" ] || die "запускайте от пользователя ubuntu (сейчас: $(id -un))"
grep -qE 'Ubuntu 24\.04' /etc/os-release || {
  grep -qE 'Ubuntu 2[24]' /etc/os-release || die "ожидается Ubuntu 24.04, найдено: $(grep PRETTY_NAME /etc/os-release)"
  printf '  WARN: не 24.04 — продолжаю, но проверено только на 24.04\n'
}

# ---------- 1. Пакеты (sudo) ----------
log "1/4. Пакеты: nginx, git, cron, certbot, python3-certbot-nginx"
sudo_step "apt update"
sudo apt update
# nginx-exists-проверка не нужна: apt install идемпотентен
sudo_step "apt install -y nginx git cron certbot python3-certbot-nginx"
sudo apt install -y nginx git cron certbot python3-certbot-nginx

sudo systemctl enable --now nginx || true
sudo systemctl enable --now cron  || true

# ---------- 2. Группа и права (D-20) ----------
log "2/4. Группа www-data и /opt/julcraft (владелец www-data:www-data, setgid)"

# группа www-data существует в Ubuntu по умолчанию (вместе с пользователем)
sudo_step "adduser ubuntu www-data (если ещё не состоит)"
if ! id ubuntu | grep -qw www-data; then
  sudo adduser ubuntu www-data
else
  printf '  ubuntu уже в группе www-data — ок\n'
fi

# новый вход в группу применяется в новой сессии; для текущей сессии:
# (setup-app.sh дополнительно использует sg-обёртку там, где нужны права группы)
if ! id -nG | grep -qw www-data; then
  printf '  NOTE: группа www-data вступит в силу в НОВОЙ ssh-сессии (или newgrp www-data)\n'
fi

sudo_step "mkdir -p /opt/julcraft + chown www-data:www-data + setgid"
if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p "$APP_DIR"
fi
sudo chown -R www-data:www-data "$APP_DIR"
sudo chmod g+s "$APP_DIR"
# ubuntu — член группы www-data, каталог принадлежит группе www-data:
# группа может писать в /opt/julcraft (создаём клон через setup-app.sh от ubuntu)
sudo chmod 2775 "$APP_DIR"

# ---------- 3. Node LTS через nvm (БЕЗ sudo) ----------
log "3/4. Node.js LTS через nvm (пользователь ubuntu)"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  printf '  nvm не найден — устанавливаю %s\n' "$NVM_VER"
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VER}/install.sh" | bash
fi

# подхватываем nvm в текущей сессии
\. "$NVM_DIR/nvm.sh"

NODE_CURRENT="$(node --version 2>/dev/null || true)"
if [ -n "$NODE_CURRENT" ] && [ "${NODE_CURRENT#v}" = "$NODE_CURRENT" ]; then :; fi
if node --version 2>/dev/null | grep -q "v${NODE_MAJOR_LTS}\."; then
  printf '  Node %s уже установлен — ок\n' "$(node --version)"
else
  printf '  устанавливаю Node %s LTS\n' "$NODE_MAJOR_LTS"
  nvm install --lts
  nvm alias default 'lts/*'
fi
printf '  node: %s / npm: %s\n' "$(node --version)" "$(npm --version)"

# запись в .bashrc (если её ещё нет)
BASHRC="$HOME/.bashrc"
touch "$BASHRC"
if ! grep -q 'NVM_DIR' "$BASHRC"; then
  {
    printf '\n# nvm (добавлено deploy/setup-server.sh)\n'
    printf 'export NVM_DIR="$HOME/.nvm"\n'
    printf '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"\n'
    printf '[ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"\n'
  } >> "$BASHRC"
  printf '  добавлена инициализация nvm в ~/.bashrc\n'
fi

# ---------- 4. PM2 + systemd автозапуск ----------
log "4/4. PM2 (глобально в nvm-окружении) + автозапуск systemd"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
printf '  pm2: %s\n' "$(pm2 --version)"

# pm2 startup генерирует sudo-команду — выполняем её сами (это ЕДИНСТВЕННОЕ
# дополнительное sudo в этом скрипте; pm2 выполняется от ubuntu)
if ! systemctl list-unit-files 2>/dev/null | grep -q '^pm2-ubuntu\.service'; then
  log "Настройка автозапуска PM2 (pm2 startup systemd)"
  PM2_STARTUP_CMD="$(pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep 'sudo' | tail -n1)" \
    || die "не удалось получить sudo-команду от pm2 startup"
  if [ -n "${PM2_STARTUP_CMD:-}" ]; then
    sudo_step "$PM2_STARTUP_CMD"
    # shellcheck disable=SC2086
    eval "$PM2_STARTUP_CMD"
  else
    die "pm2 startup не напечатал sudo-команду — выполните вручную: pm2 startup systemd -u ubuntu --hp /home/ubuntu"
  fi
else
  printf '  systemd-юнит pm2-ubuntu уже есть — ок\n'
fi

log "Готово. Дальше: bash deploy/setup-app.sh <repo-url> (см. README-deploy §2)"
