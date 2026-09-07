---

# Задание агента — Этап 7. Деплой (self-host шрифтов, сервер Ubuntu, PM2/Nginx/SSL, бэкапы, инструкция)

**Тип задачи:** производительность + инфраструктура деплоя без изменения логики сайта: перенос Google Fonts на self-host (единственная правка сайта), набор скриптов разворачивания на VPS, cron-обвязка бэкапов, инструкция README-deploy; проверка демо-запуска на Win11
**Зависимости:** этапы 1–6 выполнены и приёмлены; снапшот-механика `snapshot:capture/restore/check` готова (`plan-snapshot.md`, коммит `923f18d`). Решения руководителя D-15…D-22
**Связанные пункты плана:** `plan-2.md` §0 (золотые правила), §4 (стек: PM2 + Nginx, SQLite), §8 Этап 7 (T-7.0 … T-7.3); `plan-snapshot.md` (механика снапшотов); `docs/deploy-snapshot.md` (развёртывание из снапшота)
**Версия плана:** `plan-2.md` (итерация 2) + `plan-finances2.md` — единственные действующие

---

## Цель

1. **T-7.0 Self-host Google Fonts (D-16):** убрать внешний `@import` из обоих скинов, шрифты — локально в `public/fonts/`; цель — Lighthouse Performance ≥ 90 (сейчас 68–83 из-за Google Fonts в критическом пути).
2. **T-7.1 Сервер (D-15/D-20):** набор скриптов + инструкция для разворачивания на VPS Ubuntu 24.04 (Oracle Cloud): Node LTS (nvm), PM2 (процесс от `ubuntu`, автозапуск через systemd), Nginx (reverse proxy + SSL Let's Encrypt), домен `julcraft.zapto.org`, корень `/opt/julcraft`, владелец файлов `www-data`.
3. **T-7.2 Бэкапы (D-21):** cron-обвязка `snapshot:capture` с ротацией (ежедневно 7 дней + еженедельно 4 недели) на сервере, лог в `/var/log/julcraft-backup.log`.
4. **T-7.3 Инструкция (D-15):** README-deploy — пошаговое разворачивание с нуля силами владельца (НЕ автоматический деплой); первый запуск прода — из снапшота боевого состояния (D-22); проверка демо-запуска на Win11.

Поставка: **инструкция + набор скриптов**, которые владелец запускает вручную по шагам. Никакого автодеплоя, CI/CD, Docker — out of scope.

---

## Золотые правила (§0 плана) — обязательны

1. `mockup/**` не редактировать. **Исключение — ровно одно:** `@import`-строки в `site/public/css/style-memphis.css` и `site/public/css/style.css` разрешено заменить на локальные `@font-face` (ратифицировано D-16; `mockup/assets/css/*` остаются нетронутыми). Больше в скинах ничего не менять.
2. Скрипты для сервера — bash (Ubuntu 24.04, `#!/usr/bin/env bash`, `set -euo pipefail`); выполнение — от пользователя `ubuntu` (D-15). Установка пакетов (nginx, certbot, настройка крона/файрвола) — через `sudo` отдельными помеченными командами в инструкции: скрипты сайта sudo не содержат.
3. Никаких секретов в репозитории: токены/пароли — только в `.env` на сервере; скрипты принимают всё через env/аргументы; в журнал и отчёт секреты не писать.
4. Логика сайта, БД-схема, скрипты `db:*`/`snapshot:*` (кроме Новых правок из этого задания) не меняются.
5. Коммиты — только по явной команде руководителя.

## Решения руководителя (зафиксированы 2026-09-05 в `plan-2.md` как D-15…D-22)

| # | Решение |
|---|---|
| D-15 | VPS Ubuntu 24.04 (Oracle Cloud), домен `julcraft.zapto.org`, корень `/opt/julcraft`; установки от `ubuntu`, владелец файлов `www-data`; поставка — инструкция + скрипты, не автодеплой |
| D-16 | Self-host Google Fonts: скачать в `public/fonts`, заменить `@import` в скинах — правка CSS скинов разрешена этой записью |
| D-17 | favicon остаётся дефолтный — не трогать |
| D-20 | Node — nvm под `ubuntu`; PM2/Next работают от `ubuntu` (`pm2 startup systemd -u ubuntu` + `pm2 save`); `/opt/julcraft` — `www-data:www-data`, права через группу `www-data` + setgid на записываемых каталогах (БД, uploads, .next); обновление кода без sudo |
| D-21 | Бэкапы: cron `/etc/cron.d` — ежедневный снапшот (хранение 7 дней) + еженедельный (вс, 4 недели); ≤11 артефактов ≈ 1 ГБ; лог `/var/log/julcraft-backup.log` |
| D-22 | Первый запуск прода — из снапшота (`docs/deploy-snapshot.md`); демо-сид — запасной вариант |

---

## Контекст (состояние на момент старта)

- **Шрифты (T-7.0):** `site/public/css/style-memphis.css:11` — `@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Nunito:wght@400;600;700;800&display=swap')`; `site/public/css/style.css:9` — `@import url('https://fonts.googleapis.com/css2?family=Shrikhand&family=IBM+Plex+Mono:wght@400;500;600&display=swap')`. `site/app/layout.tsx:18-19` — `preconnect` к fonts.googleapis.com/fonts.gstatic.com (после self-host — удалить как потерявшие смысл).
- **Стек:** Next.js 16.3.1 + TS + Drizzle + SQLite (`better-sqlite3`); `next.config.ts` — только `serverExternalPackages: ["better-sqlite3"]`. Скрипты npm: `dev/build/start/lint/db:*/snapshot:*` (см. `site/package.json`). Окружение разработки: Win11, Node v24.
- **Снапшот:** `snapshot:capture` создаёт `site/julcraft-snapshot-*.zip` (~92 МБ: БД + `public/uploads/**` + manifest), `snapshot:restore`/`snapshot:check` — разворачивание/проверка; zip вне git (`site/*.zip` в корневом `.gitignore`), содержит личные данные и `telegram.botToken` — не публиковать. Порядок: restore ДО build (пререндеры/sitemap читают БД при сборке).
- **Env:** `.env.example` (DATABASE_URL, SITE_URL, ADMIN_LOGIN/PASSWORD, AUTH_SECRET, AUTH_TRUST_HOST, AUTH_URL, TELEGRAM_*). Прод-значения SITE_URL=`https://julcraft.zapto.org`, AUTH_URL — тот же адрес.
- **Пути runtime (записываемые):** `site/julcraft.db` (+ возможные -wal/-shm), `site/public/uploads/`, `site/.next/`. Путь БД — через `lib/db-path.ts` (`DATABASE_URL`, по умолчанию `file:./julcraft.db` от `site/`).
- **9 ошибок линтера** (D-19) — отложены, в этой задаче не исправлять (не трогать чужие строки: допустимы только предупреждения на новый код).
- Next.js 16: перед написанием кода сайта прочитать гайды в `node_modules/next/dist/docs/` — конвенции могли измениться.

---

## Шаг 0 (T-7.0). Self-host Google Fonts

1. **Скачать шрифты** (одноразовый скрипт `scripts/fetch-fonts.ts` в стиле `fetch-product-images.ts` или скачивание утилитой — главное результат в git):
   - Для каждого семейства (Unbounded 400/600/700/800, Nunito 400/600/700/800, Shrikhand 400, IBM Plex Mono 400/500/600) получить woff2-файлы и CSS с `@font-face`. Источник — сам Google Fonts CSS2 API (запрос с `User-Agent: Chrome` вернёт woff2 с unicode-range-блоками): `https://fonts.googleapis.com/css2?family=...&display=swap`.
   - Сохранить: `site/public/fonts/<family>-<weight>.woff2` (subset «latin» + «cyrillic» — файлы с unicode-range для обоих алфавитов; имена — на усмотрение агента, схема в отчёте). **ВНИМАНИЕ: Nunito/Unbounded/IBM Plex Mono — кириллица нужна обязательно (сайт ru)**; Shrikhand — латиница+цифры (est. 1976), проверить фактическое содержимое: если кириллических субсетов нет в CSS API — так и оставить, Shrikhand кириллицу не поддерживает.
2. **Сгенерировать `public/fonts/fonts.css`** с `@font-face` (src: `/fonts/<file>.woff2`, `font-display: swap`, сохранить `unicode-range` из CSS API) — по одному блоку на каждый субсет.
3. **Заменить `@import` в скинах (единственная разрешённая правка, D-16):**
   - `style-memphis.css:11` → `@import url('/fonts/fonts.css');`
   - `style.css:9` → тот же `@import url('/fonts/fonts.css');` (общий файл: Shrikhand+IBM Plex Mono нужны «тёплому» скину, Unbounded+Nunito — мемфису; один общий fonts.css проще, лишние строки для каждого скина не страшны).
   - `mockup/assets/css/*` НЕ трогать.
4. **Убрать preconnect** из `app/layout.tsx` (обе строки fonts.googleapis.com / fonts.gstatic.com) вместе с комментарием про Google Fonts.
5. **Проверки:**
   - `npm run build` — без ошибок; сайт в prod-режиме (`npm run build && npm run start`) грузит шрифты с localhost (DevTools → Network → фильтр «font»: только `/fonts/...`); в Network нет обращений к `fonts.googleapis.com`/`fonts.gstatic.com`.
   - Визуально: обе кожи (переключателем) — начертания те же, кириллица (заголовки «Витрина», «Каталог», тексты) — тем же шрифтом, не системным fallback; `document.fonts` в консоли показывает загруженные семейства.
   - `@import` в CSS скинов указывает на локальный файл; grep по `site/` не находит `fonts.googleapis.com` (кроме скрипта загрузки, где URL — источник данных; скрипт после скачивания можно удалить или оставить как историю — на усмотрение).
   - **Lighthouse (mobile, prod, localhost):** `/`, `/catalog`, `/product/<любой>`, `/configurator/<любой>`, `/contacts` — Performance по каждой странице ≥ 90 (цель T-6.3, закрытая этим шагом); цифры всех прогонов — в отчёт (до/после).
6. **Приёмка шага:** шрифты в `public/fonts/` закоммичены (не в gitignore), оба скина — локальные `@font-face`, preconnect удалён, Lighthouse ≥ 90 на перечисленных страницах, кириллица визуально не сломана.

## Шаг 1 (T-7.1). Скрипты разворачивания сервера

Каталог `deploy/` в корне репозитория (рядом с `docs/`, не внутри `site/`) — скрипты bash + конфиги-шаблоны. Все скрипты — idempotent (повторный запуск не ломает).

### 1.1 `deploy/setup-server.sh` (один раз на чистый VPS; от `ubuntu`, помеченные sudo-блоки)

1. `sudo apt update && sudo apt install -y nginx git cron` (+ `certbot` и `python3-certbot-nginx` — в Шаге 2 или здесь, единым списком).
2. Группа/права (D-20): `sudo adduser ubuntu www-data` (если группы нет — `addgroup --system www-data` обычно есть); `sudo mkdir -p /opt/julcraft && sudo chown -R www-data:www-data /opt/julcraft && sudo chmod g+s /opt/julcraft`; setgid-каталоги для записываемых мест создать внутри `setup-app.sh` (они внутри клона).
3. Node LTS через nvm под `ubuntu` (не NodeSource, не sudo): установить nvm → `nvm install --lts` → запись в `~/.bashrc` (`export NVM_DIR=...`, nvm.sh). Версию зафиксировать в инструкции (Node 22 LTS актуален на 2026-09; проверить перед написанием).
4. PM2 от `ubuntu`: `npm i -g pm2` (в nvm-окружении), `pm2 startup systemd -u ubuntu --hp /home/ubuntu` (команда печатает sudo-строку — выполнить её, это единственный sudo в PM2-сетапе), затем `pm2 save` после первого старта приложения.
5. Файрвол Oracle Cloud: предупредить в инструкции, что ingress-правила (80/443) открываются в консоли OCI, а на уровне ОС — `sudo ufw allow 'Nginx Full'` + `sudo ufw allow OpenSSH` + `sudo ufw enable` (аккуратно: не отрезать SSH; если ufw неактивен и рискованно — пометить как опциональный шаг).
6. Итог скрипта: готовый nginx (стартовая страница отключена не обязательно), node/pm2 в PATH для `ubuntu`, группа у пользователя, `/opt/julcraft` создан.

### 1.2 `deploy/setup-app.sh` (разворачивание сайта в `/opt/julcraft`; от `ubuntu`)

1. Если `/opt/julcraft/site` не существует: `git clone <репозиторий> /opt/julcraft/repo-temp`… — фактическую схему выберет агент; проще: клонировать репозиторий целиком в `/opt/julcraft` один раз (`git clone <url> /opt/julcraft` — при наличии прав через группу www-data + sgid; повторные обновления — `git pull` от `ubuntu` в этой же группе). Скрипт принимает URL репозитория аргументом или env `REPO_URL`.
2. Права: `chgrp -R www-data /opt/julcraft` не нужен (владелец уже www-data — D-20); записываемые места (группа пишет): `chmod -R g+wX` + setgid на `site/julcraft.db*` (если создаётся), `site/public/uploads`, `site/.next` — создать заранее `mkdir -p site/public/uploads/{products,components,categories,collages}` + `chmod g+wXs`.
3. `cd site && npm ci` (nvm-node доступен в интерактивном bash; в PM2/systemd убедиться, что PATH содержит nvm — см. ecosystem-файл ниже).
4. `.env`: НЕ генерировать автоматически — остановить скрипт с подсказкой «создайте .env из .env.example (см. README-deploy §env), затем повторно запустите setup-app.sh» — повторный запуск пропускает готовый `.env` (idempotency).
5. Restore снапшота (D-22): если рядом лежит `julcraft-snapshot-*.zip` (путь аргументом `SNAPSHOT` или поиск в `/opt/julcraft`/`/tmp`) — `npm run snapshot:restore -- <zip>`; иначе — сообщение «продолжите по README-deploy: вариант Б (снапшот, основной) или А (db:seed)» и выход с подсказкой. Restore ДО build.
6. `npm run snapshot:check` (или `db:check` для варианта А) — прервать при провале.
7. `npm run build`.
8. PM2: `deploy/ecosystem.config.js` (или `.cjs`) в `site/`: имя `julcraft`, скрипит `npm start`/`node_modules/next/dist/bin/next start`, env: PATH с nvm-Node (`/home/ubuntu/.nvm/versions/node/vX/bin`), NODE_ENV=production, каталог `site/`; флаг `--update-env` при перезапуске — в инструкцию. Первый запуск: `pm2 start ecosystem.config.js && pm2 save` (перезапуск сбережён: `pm2 restart julcraft`).
9. Валидация: `pm2 ls` — julcraft online; `curl -sI http://127.0.0.1:3000` (или порт из env PORT — если Next слушает 3000, зафиксировать; иначе указать) — HTTP 200/3xx.

### 1.3 `deploy/setup-nginx.sh` (sudo; reverse proxy + SSL)

1. Скрипт-шаблон конфига `deploy/nginx/julcraft.conf.template` с подстановкой домена: `server_name julcraft.zapto.org`, `proxy_pass http://127.0.0.1:3000`, стандартные proxy-заголовки (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`), `client_max_body_size 10m` (загрузка PNG ≤2 МБ + запас), gzip — по вкусу (см. ниже «Не делать» — не переусложнять).
2. Скрипт от `ubuntu`: `sudo cp` конфиг в `/etc/nginx/sites-available/julcraft`, `ln -s` в sites-enabled, удалить дефолтный сайт (если мешает), `nginx -t` → `sudo systemctl reload nginx`.
3. SSL: certbot — РУКОВОДИТЕЛЬ выбирает момент (нужен DNS на IP VPS); в скрипт — `deploy/setup-ssl.sh`: сначала HTTP-only конфиг (без ssl-блока), затем `sudo certbot --nginx -d julcraft.zapto.org --redirect` (или `--non-interactive --agree-tos -m <email>` — email аргументом/env, не хардкод). Идентификация: `zapto.org` — DynDNS-сервис; A-запись домена → IP VPS настраивается владельцем на стороне zapto.org — раздел в инструкции.
4. После certbot: `https://julcraft.zapto.org` — HTTP/2 автоматически, redirect HTTP→HTTPS; `AUTH_URL`/`SITE_URL` в `.env` прод-значения (см. Шаг 3 env-раздел) — перезапуск `pm2 restart julcraft --update-env`.

### 1.4 Приёмка шага (насколько возможна без реального VPS — см. «Верификация»)

- Скрипты проходят `bash -n` (синтаксис); `shellcheck` (если доступен на Win11 — необязательно, отметить в отчёте).
- Чек-лист инструкции (README-deploy) покрывает все ручные sudo-команды; агент НЕ запускает их сам.
- Демо на Win11: `ecosystem.config.js` валиден локально (`pm2 start` на Win-машине опционально — проверить синтаксис node; реальный запуск pm2 — на усмотрение, отчёт).

## Шаг 2 (T-7.2). Бэкапы на сервере (cron + ротация)

1. `deploy/backup/snapshot-backup.sh` (от `ubuntu`, без sudo):
   - каденция/тип: аргумент `daily|weekly` (влияет только на подпапку и TTL);
   - `cd /opt/julcraft/site && npm run snapshot:capture` → артефакт перемещается в `/opt/julcraft/backups/<daily|weekly>/`;
   - ротация по штампу в имени файла (`julcraft-snapshot-YYYY-MM-DD-HHmm.zip`): daily — хранить 7, weekly — 4; старше — удалять (сортировка по дате в имени, не mtime);
   - лог: `>> /var/log/julcraft-backup.log` — владелец файла `ubuntu:www-data`? — НЕТ: `/var/log` — root; лог вести в `/opt/julcraft/backups/backup.log` (без sudo) — зафиксировать это отклонение от D-21 в отчёте (предложение: `sudo touch /var/log/julcraft-backup.log && sudo chown ubuntu:www-data ...` — опциональной командой в README-deploy; в скрипте — путь через env `BACKUP_LOG` с дефолтом `/opt/julcraft/backups/backup.log`);
   - `sqlite.backup()` в capture требует остановленного приложения? — нет (backup API работает на живой БД; но инструкцией зафиксировать: ежедневный запуск — ночь 03:30, WAL мал).
2. `deploy/backup/crontab` (шаблон для `/etc/cron.d/julcraft-backup`): 
   ```
   # ежедневный 03:30, ретеншен 7; еженедельник вс 04:00, ретеншен 4
   30 3 * * * ubuntu /opt/julcraft/deploy/backup/snapshot-backup.sh daily >> $BACKUP_LOG 2>&1
   0 4 * * 0 ubuntu /opt/julcraft/deploy/backup/snapshot-backup.sh weekly >> $BACKUP_LOG 2>&1
   ```
   Установка — sudo-команда в README-deploy: `sudo cp deploy/backup/crontab /etc/cron.d/julcraft-backup && sudo chmod 0644 ... && sudo chown root:root ...`.
3. **Ротация по счёту, не только дате:** защититься от переполнения: суммарный размер `/opt/julcraft/backups` не должен расти бесконечно — количество файлов ограничено ротацией (7 daily + 4 weekly = 11 ≈ 1 ГБ при 92 МБ/шт — D-21); контроль размера — `du` в лог.
4. Приёмка: скрипт синтаксически валиден; ротация распарсена юнит-тестом на Win11 (маленький Node-скрипт `deploy/backup/test-rotation.mjs` или включение в `site/scripts/check-snapshot.ts` — НЕТ, не смешивать: отдельный файл в deploy/backup/ или просто ручная проверка в отчёте — на усмотрение агента, зафиксировать в отчёте как проверено).

## Шаг 3 (T-7.3). README-deploy + проверка демо-запуска на Win11

1. `README-deploy.md` в корне репозитория (рядом с README.md) — полный путь владельца от чистого VPS до HTTPS-сайта:
   - **0. prerequisites:** VPS Oracle Cloud Ubuntu 24.04, SSH-доступ как `ubuntu`, домен `julcraft.zapto.org` (A-запись → IP VPS на стороне zapto.org), репозиторий + снапшот-артефакт (scp на сервер: `scp julcraft-snapshot-*.zip ubuntu@<ip>:/tmp/`), OCI ingress 80/443/22;
   - **1. сервер:** `bash deploy/setup-server.sh` (перечень sudo-команд, которые он выполняет — прозрачно);
   - **2. приложение:** `bash deploy/setup-app.sh <repo-url>` … `.env` (значения: SITE_URL/AUTH_URL=`https://julcraft.zapto.org`, ADMIN_*, AUTH_SECRET=`openssl rand -base64 32`, TELEGRAM_*), снапшот → `pm2 save`;
   - **3. nginx + ssl:** `bash deploy/setup-nginx.sh && bash deploy/setup-ssl.sh <email>`; проверка `https://julcraft.zapto.org` — каталог, товар, заявка, скин-переключатель;
   - **4. бэкапы:** установка cron (sudo cp), пробный `snapshot-backup.sh daily` вручную; просмотр лога;
   - **5. обновление сайта:** `cd /opt/julcraft && git pull && cd site && npm ci && npm run build && pm2 restart julcraft --update-env` (краткий раздел, он главный в бытовой жизни);
   - **6. восстановление из бэкапа:** ссылка на `docs/deploy-snapshot.md` (restore при остановленном приложении: `pm2 stop julcraft`, restore, check, build, `pm2 start`);
   - **7. диагностика:** `pm2 ls / logs`, `pm2 monit`, `pm2 logs julcraft --lines 100`, nginx error log, OCI console;
   - **8. безопасность:** токен в артефакте не публиковать; SSH по ключам; HTTPS forced certbot; `sudo ufw` опционально.
2. **Проверка демо-запуска на Win11** (T-7.3 из плана): полный цикл из README-deploy на рабочей машине, адаптированный под Win (npm ci → .env → restore (или seed) → check → build → start) — записать результат в отчёт (это регресс `deploy-snapshot.md` §5 + новый: с fonts.css, sitemap с SITE_URL=localhost и т.д.). Если рабочего окружения агента недостаточно для запуска Next — зафиксировать, что проверено (build/линт/визуально), а полный smoke — руководитель.
3. Запись в «Журнал изменений» `plan-2.md` (дата, T-7.0…T-7.3, суть). Чекбоксы Этапа 7 в `plan-2.md` по итогам работы отмечает руководитель, не агент (как в plan-snapshot.md).
4. **Приёмка шага:** README-deploy самодостаточен (по нему владелец разворачивает сайт без чтения кода); все скрипты упомянуты и вызваны в тексте; демо-проверка на Win11 зафиксирована.

---

## Верификация (что агент проверяет сам, без реального VPS)

- `bash -n` всех `deploy/**/*.sh` (через Git Bash/WSL на Win11, если доступно; иначе — синтаксис-ревью вручную, зафиксировать в отчёте).
- Юнит-проверка ротации бэкапов (создание N фейковых zip с датами в имени, запуск логики ротации, проверка оставшихся) — формат на усмотрение (bash-тест или Node-скрипт), результат в отчёт.
- Полный локальный прогон T-7.0 (build/start/Lighthouse/шрифты/кириллица) — обязательный.
- Демо-цикл README-deploy §Проверка на Win11 — обязательный (в рамках доступного окружения).
- Реальное разворачивание на VPS — владелец по README-deploy; вопросы владельца — в отчёт агента списком «что уточнить при первом запуске».

## Критерии приёмки

1. **T-7.0:** шрифты (Unbounded, Nunito, Shrikhand, IBM Plex Mono — все веса из @import) лежат в `site/public/fonts/` (+ fonts.css), закоммичены; `@import` в обоих скинах ведёт на `/fonts/fonts.css`; preconnect из layout удалён; в prod-сборке нет запросов к fonts.googleapis.com/gstatic; кириллица отображается штатными шрифтами; **Lighthouse Performance ≥ 90 (mobile) на /, /catalog, /product/x, /configurator/x, /contacts** — цифры до/после в отчёте.
2. **T-7.1:** `deploy/` содержит setup-server.sh, setup-app.sh, setup-nginx.sh, setup-ssl.sh, ecosystem.config.js, nginx-конфиг-шаблон — все `bash -n`-валидны, idempotent, sudo вынесено в README-deploy/помечено; схема прав D-20 реализована (www-data владелец, ubuntu — группа, setgid на записываемых каталогах).
3. **T-7.2:** snapshot-backup.sh (daily/weekly, ротация 7+4, лог) + шаблон /etc/cron.d + инструкция установки; ротация проверена юнит-тестом/вручную (отчёт).
4. **T-7.3:** README-deploy.md — полный путь 0…8 (сервер → приложение → nginx/ssl → бэкапы → обновление → восстановление → диагностика → безопасность); демо-проверка на Win11 выполнена и зафиксирована; журнал plan-2.md обновлён агентом (запись), чекбоксы — руководитель.
5. Общие: `npm run build`, `npm run lint` — без новых ошибок (9 старых — D-19, не трогать); `mockup/**` не изменён (кроме ратифицированных двух @import-строк в site-копиях скинов); `db:seed/db:check/snapshot:*` не изменены; сайт визуально идентичен макету (шрифты — те же семейства/веса).

## Не делать (out of scope)

- Автоматический деплой, CI/CD, GitHub Actions, Docker, Ansible — поставка: инструкция + скрипты.
- PostgreSQL, Object Storage — SQLite + файлы, как в плане.
- Favicon (D-17), чистка 9 ошибок линтера (D-19), обезличенный снапшот — backlog/отложено.
- Правки CSS скинов сверх замены @import-строк; правки `mockup/**`.
- Скачивание шрифтов с сторонних CDN (зеркала) — только официальный CSS2 API Google Fonts.
- Реальное выполнение sudo/ssh-команд на VPS (даже если доступ есть) — только подготовка; исполнение — владелец.
- next/font — НЕ использовать: шрифты подключены в скинах через @import, не в app-коде (только если руководитель не решит иначе).

## Вопросы — ВСЕ РЕШЕНЫ руководителем (2026-09-05, D-15…D-22)

| # | Вопрос | Решение |
|---|---|---|
| 1 | Домен/хостинг (Q-5) | D-15: Oracle Cloud VPS Ubuntu 24.04, `julcraft.zapto.org`, `/opt/julcraft` |
| 2 | Процесс/права | D-20: Node nvm + PM2 от `ubuntu`; файлы `www-data:www-data`, группа+setgid |
| 3 | Бэкапы | D-21: cron, daily 7 + weekly 4, лог, ротация по имени |
| 4 | Начальное состояние | D-22: снапшот (первый запуск); db:seed — запасной |
| 5 | Шрифты/Lighthouse | D-16: self-host, правка двух @import-строк скинов разрешена |
| 6 | favicon / линтер | D-17/D-19: не трогать в этой задаче |

## Порядок и отчёт

Последовательно: Шаг 0 → 1 → 2 → 3 (шрифты первыми — от них зависит демо-проверка и Lighthouse; скрипты сервера — до README, чтобы инструкция ссылалась на реальные файлы; бэкапы — до README по той же причине). По завершении — отчёт руководителю: что сделано по T-7.0…T-7.3; список созданных/изменённых файлов (site/ и deploy/); список шрифтовых файлов и схема имён; цифры Lighthouse до/после по всем страницам и прогонам; результат bash-проверок скриптов и юнит-теста ротации; результат демо-проверки на Win11; список «уточнить при первом реальном запуске» (например: версия Node LTS на момент запуска, поведение zapto.org DNS, порт Next в PM2); запись для «Журнала изменений» `plan-2.md`. После подтверждения приёмки — чекбоксы T-7.0 … T-7.3 в `plan-2.md` §8 отмечает руководитель.
