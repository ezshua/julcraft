# README-deploy — разворачивание JulCraft на VPS с нуля

> Этап 7 (T-7.3), решения D-15…D-22 из `plan-2.md`. Пошаговая инструкция
> для владельца: от чистого VPS до работающего HTTPS-сайта с бэкапами.
> Всё запускается вручную — никакого автодеплоя. Скрипты лежат в `deploy/`
> репозитория, выполняются от пользователя `ubuntu` (sudo-команды —
> помечены `[sudo]` внутри скриптов и продублированы ниже).

Стек: VPS **Ubuntu 24.04** (Oracle Cloud), домен `julcraft.zapto.org`,
корень `/opt/julcraft`, **Node 22 LTS** (nvm), **PM2** (systemd), **Nginx**
(reverse proxy), **Let's Encrypt** (certbot), SQLite, файлы принадлежат
`www-data:www-data`, обновляет `ubuntu` через группу `www-data` (D-20).

---

## 0. Необходимое (prerequisites)

1. **VPS Oracle Cloud** Ubuntu 24.04, доступ по SSH как `ubuntu` (ключами).
   В консоли OCI (Networking → Security Groups / VCN): ingress-правила
   **TCP 22, 80, 443** из 0.0.0.0/0. Без этого сайт не откроется снаружи.
2. **Домен** `julcraft.zapto.org` — сервис DynDNS zapto.org: заведите
   аккаунт, создайте хост `julcraft` и **A-запись → публичный IP VPS**.
   IP видно в консоли OCI или: `curl https://api.ipify.org`.
   DNS должна раскраситься ДО шага 3.2 (certbot проверяет домен).
3. **Репозиторий**: доступ к git-репозиторию JulCraft (URL для clone —
   подставьте свой: `https://github.com/<owner>/julcraft.git`).
4. **Снапшот боевого состояния** — основной вариант первого запуска
   (D-22): файл `julcraft-snapshot-*.zip` (~92 МБ), снятый на рабочей
   машине (`npm run snapshot:capture` из `site/`). Перенос на сервер:

   ```bash
   # с рабочей машины (Win: scp из PowerShell/Git Bash тоже работает)
   scp site/julcraft-snapshot-2026-09-04-1356.zip ubuntu@<IP>:/tmp/
   ```

   ВНИМАНИЕ: артефакт содержит личные данные клиентов и токен
   Telegram-бота — только по SSH/защищённому каналу, не публиковать.

Подключение: `ssh ubuntu@<IP>` — все команды ниже выполняются там.

---

## 1. Сервер (nginx, права, Node, PM2)

```bash
# свежий клон (репозиторий нужен и для скриптов deploy/)
cd /opt
sudo mkdir -p /opt/src && sudo chown ubuntu:ubuntu /opt/src   # [sudo] временное место
cd /opt/src
git clone https://github.com/<owner>/julcraft.git
cd julcraft

bash deploy/setup-server.sh
```

Скрипт выполняет (полностью прозрачно, помечено `[sudo]`):

| Шаг | Что делает |
|---|---|
| [sudo] | `apt update`; `apt install -y nginx git cron certbot python3-certbot-nginx` |
| [sudo] | `adduser ubuntu www-data` — членство в группе для записи в `/opt/julcraft` |
| [sudo] | `mkdir -p /opt/julcraft`; `chown -R www-data:www-data`; `chmod 2775` (setgid) |
| — | установка nvm → `nvm install --lts` (Node 22 LTS) под `ubuntu`, запись в `~/.bashrc` |
| — | `npm i -g pm2` |
| [sudo] | автозапуск PM2: `pm2 startup systemd -u ubuntu --hp /home/ubuntu` печатает sudo-команду — скрипт выполняет её сам |

После завершения: `node -v` (ожидается v22.x), `pm2 -v`, группа
`www-data` в `id` (вступает в силу в новой SSH-сессии — переподключитесь).

### 1.4 Файрвол (опционально)

OCI ingress уже фильтрует снаружи. Локальный ufw — по желанию:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

ОСТОРОЖНО: перед `enable` убедитесь, что порт 22 разрешён — иначе
потеряете SSH-доступ (в Oracle Cloud также проверьте Source ingress
для 22 в консоли OCI). Если сомневаетесь — пропустите этот шаг,
ingress-правил OCI достаточно.

---

## 2. Приложение (клон, .env, снапшот, build, PM2)

```bash
# переподключились по ssh (группа www-data активна)
cd /opt/src/julcraft
bash deploy/setup-app.sh https://github.com/<owner>/julcraft.git /tmp/julcraft-snapshot-2026-09-04-1356.zip
```

Скрипт сам: клонирует репозиторий в `/opt/julcraft` → выставит права
(`chgrp www-data`, setgid + `g+rwX` на `site/public/uploads`, `site/.next`)
→ `npm ci` → **остановится на .env** (первый раз).

### 2.2 `.env` (первый запуск создаёт заглушку — заполните и перезапустите)

```bash
nano /opt/julcraft/site/.env
```

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `file:./julcraft.db` (не менять) |
| `SITE_URL` | `https://julcraft.zapto.org` |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | доступ к `/admin` — придумайте |
| `AUTH_SECRET` | сгенерируйте: `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://julcraft.zapto.org` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | значения из настроек (env-приоритет) |

Затем повторно (продолжит с места остановки):

```bash
cd /opt/src/julcraft
bash deploy/setup-app.sh https://github.com/<owner>/julcraft.git /tmp/julcraft-snapshot-2026-09-04-1356.zip
```

Дальше скрипт: `snapshot:restore` (D-22; снапшот ищет по аргументу, env
`SNAPSHOT` или в `/opt/julcraft`, `/tmp`) → `snapshot:check` (упадёт при
провале — это страховка) → `npm run build` → `pm2 start` (конфиг
`site/ecosystem.config.cjs`: fork/1 процесс, `next start`) → `pm2 save`
(сохранить список процессов для автозапуска после ребута) → curl-проверка
`http://127.0.0.1:3000` (ожидается HTTP 200).

**Вариант А (запасной):** если снапшота нет, вместо шага restore из
`/opt/julcraft/site` выполните `npm run db:seed && npm run db:check`
(демо из макета) и снова запустите `setup-app.sh` — он увидит БД и
продолжит. Подробности: `docs/deploy-snapshot.md`.

Порядок restore ДО build — обязателен: пререндеры и sitemap читают БД
при сборке.

---

## 3. Nginx + SSL

### 3.1 Reverse proxy (HTTP)

```bash
cd /opt/src/julcraft   # или cd /opt/julcraft — скрипт одинаковый
bash deploy/setup-nginx.sh
```

`[sudo]`-команды внутри: копирование `deploy/nginx/julcraft.conf.template`
(с подставленным доменом) в `/etc/nginx/sites-available/julcraft`,
симлинк в `sites-enabled`, удаление дефолтной заглушки, `nginx -t`,
`systemctl reload nginx`.

Проверка (нужна работающая A-запись): `curl -sI http://julcraft.zapto.org`
→ HTTP 200.

### 3.2 SSL (Let's Encrypt)

```bash
bash deploy/setup-ssl.sh <ваш-email>
```

Скрипт: проверит, что A-запись домена указывает на IP этого VPS (упадёт
с внятной ошибкой, если DNS ещё не расползлась — подождите и повторите),
затем `[sudo] certbot --nginx -d julcraft.zapto.org --redirect
--non-interactive --agree-tos -m <email>`, проверит `https://` и
автопродление (`certbot renew --dry-run`). HTTP/2 включается nginx'ом
автоматически вместе с ssl.

### 3.3 Прод-env после SSL

В `.env` значения `SITE_URL`/`AUTH_URL` уже `https://…` (шаг 2.2) —
перезапустите приложение, чтобы env применился:

```bash
pm2 restart julcraft --update-env
```

Сайт: `https://julcraft.zapto.org` — пройдитесь по каталогу, странице
товара, отправьте тестовую заявку, переключите скин (переключатель в
шапке) — заголовки/шрифты должны выглядеть одинаково в обоих скинах.

---

## 4. Бэкапы (cron, D-21)

```bash
# пробный запуск вручную (от ubuntu, без sudo)
bash /opt/julcraft/deploy/backup/snapshot-backup.sh daily
cat /opt/julcraft/backups/backup.log      # лог + артефакт в backups/daily/
```

Установка расписания (`/etc/cron.d`):

```bash
cd /opt/julcraft
sudo cp deploy/backup/crontab /etc/cron.d/julcraft-backup   # [sudo]
sudo chmod 0644 /etc/cron.d/julcraft-backup                 # [sudo]
sudo chown root:root /etc/cron.d/julcraft-backup            # [sudo]
```

Расписание: ежедневно 03:30 (`daily`, хранятся свежие **7**), воскресенье
04:00 (`weekly`, свежие **4**). Итого ≤ 11 артефактов ≈ 1 ГБ (92 МБ/шт).
Ротация — по штампу даты в имени файла. Снимок делается через
`sqlite.backup()` на живой БД (приложение можно не останавливать),
ночное окно выбрано ради тишины и малого WAL-файла.

**Про лог:** план D-21 упоминал `/var/log/julcraft-backup.log`, но
`/var/log` недоступен на запись без sudo. Лог ведётся в
`/opt/julcraft/backups/backup.log` (env `BACKUP_LOG` в скрипте
переопределяет). Если хотите центральный лог:

```bash
sudo touch /var/log/julcraft-backup.log                  # [sudo] опционально
sudo chown ubuntu:www-data /var/log/julcraft-backup.log # [sudo]
# и запускайте snapshot-backup.sh с BACKUP_LOG=/var/log/julcraft-backup.log
# (прописывается в /etc/cron.d/julcraft-backup вручную)
```

---

## 5. Обновление сайта (бытовое)

Изменения приходят в репозиторий (этапы, контент) — на сервере:

```bash
cd /opt/julcraft && git pull
cd site && npm ci
npm run build
pm2 restart julcraft --update-env
```

Занимает пару минут, сайт на это время продолжает работать (restart —
секунды). Перед значимыми изменениями снимите снапшот вручную (§6).

---

## 6. Восстановление из бэкапа

Полная инструкция: `docs/deploy-snapshot.md`. Кратко (restore — при
ОСТАНОВЛЕННОМ приложении, поверх — с `--force`):

```bash
pm2 stop julcraft
cd /opt/julcraft/site
npm run snapshot:restore -- ../backups/daily/julcraft-snapshot-2026-09-05-0330.zip
npm run snapshot:check
npm run build
pm2 start julcraft
```

Артефакты лежат в `/opt/julcraft/backups/daily/` (7 свежих) и
`/opt/julcraft/backups/weekly/` (4 свежих).

---

## 7. Диагностика

| Что смотреть | Команда |
|---|---|
| Статус приложения | `pm2 ls` (столбец status = online) |
| Логи сайта (живые) | `pm2 logs julcraft --lines 100` |
| Мониторинг CPU/RAM | `pm2 monit` |
| Логи PM2 (перезапуски) | `~/.pm2/logs/julcraft-error.log` |
| Nginx | `sudo tail -n 50 /var/log/nginx/error.log` |
| Порт 3000 локально | `curl -sI http://127.0.0.1:3000` |
| Сертификат | `sudo certbot certificates` |
| OC Console | ingress-правила, перезагрузка инстанса |
| Бэкап-лог | `tail -n 50 /opt/julcraft/backups/backup.log` |

После перезагрузки VPS: `pm2 ls` — julcraft должен подняться сам
(systemd-юнит `pm2-ubuntu` + `pm2 save`). Если нет:
`pm2 start /opt/julcraft/site/ecosystem.config.cjs && pm2 save`.

---

## 8. Безопасность

- **Снапшоты содержат личные данные и токен бота** — не выкладывайте
  `backups/` и артефакты в открытые каналы; перенос — scp/носитель.
- `.env` (пароли, AUTH_SECRET, токен) — только на сервере, в git не
  попадает (`.gitignore`), в логи не пишется.
- SSH — по ключам (в Oracle Cloud парольный вход выключен по умолчанию).
- HTTPS принудителен (certbot redirect); HTTP/2 включён.
- `ADMIN_PASSWORD` — стойкий, отличный от всех других сервисов.
- Опционально: `ufw` (см. §1.4) — OCI ingress как первый рубеж.

---

## Приложение: состав поставки деплоя

```
deploy/
  setup-server.sh          — VPS: пакеты, права, nvm+Node LTS, PM2+systemd
  setup-app.sh             — /opt/julcraft: клон, права, npm ci, .env-пауза,
                             restore→check→build→pm2 start+save
  setup-nginx.sh           — reverse proxy из шаблона (sudo внутри)
  setup-ssl.sh             — certbot --nginx + проверки
  nginx/julcraft.conf.template — конфиг проксирования (80 → 127.0.0.1:3000)
  backup/snapshot-backup.sh — capture + ротация 7/4 + лог
  backup/crontab           — /etc/cron.d-шаблон (03:30 daily, вс 04:00 weekly)
  backup/test-rotation.sh  — юнит-тест ротации (bash, 5 кейсов)
site/ecosystem.config.cjs  — PM2-конфиг (fork/1, next start, nvm-PATH)
```

Все скрипты идемпотентны (повторный запуск не ломает), `set -euo pipefail`,
sudo — только в setup-server/setup-nginx/setup-ssl (помечено `[sudo]`).
