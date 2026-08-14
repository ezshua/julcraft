# Задание агента — Этап 1. Фундамент (перенос макета)

**Тип задачи:** инфраструктура / каркас / слой данных
**Зависимости:** нет (этап выполняется первым в репозитории)
**Связанные пункты плана:** `plan-2.md` §2 (карта соответствия), §3 D-2/D-7/D-12, §4 (стек и структура), §5 (модель данных), §8 Этап 1 (T-1.1, T-1.2, T-1.3)
**Версия плана:** plan-2.md (итерация 2, 2026-08-14) — она единственная действующая; plan-1.md и его stage-*.md игнорировать

---

## Цель

Создать в папке `site/` пустой, но работающий проект Next.js (App Router) + TypeScript, в который макет перенесён «копированием 1:1»:

1. скины и переключатель скинов работают как в макете;
2. на `/` отображается каркас главной из `mockup/home.html` (шапка, мобильное меню, вывеска-герой, футер);
3. настроена БД SQLite + Drizzle с миграцией по схеме §5.

Критерий успеха этапа (из плана): `npm run dev` — главная с вёрсткой из макета, переключатель скинов работает; `npm run db:migrate` создаёт БД с таблицами.

---

## Золотые правила (§0 плана) — обязательны

1. `mockup/` — **источник истины**. Всё переносится копированием 1:1: HTML-структура, CSS-классы, тексты, иконки (inline-SVG), состояния.
2. **Запрещено**: переделывать вёрстку, придумывать свои компоненты/дизайн/тексты/поля, «улучшать» одобренное. Никакого Tailwind, shadcn/ui и прочих UI-фреймворков (D-2).
3. Чего нет в макете — не додумывать; при блокере остановиться и записать вопрос руководителю (в отчёт), а не решать самостоятельно.
4. Файлы макета (`mockup/**`) **не редактировать** — только читать.
5. Копии CSS/JS переносятся **байт-в-байт** (можно проверить хэшем), включая `@import` шрифтов внутри CSS.

---

## Контекст

- Репозиторий: `C:\alexx\Src\julcraft`. Макет — `mockup/` (корень репо). Целевой сайт — `site/` (сейчас пустая).
- `mockup/assets/css/style-memphis.css` — активный скин по умолчанию (шрифты Unbounded + Nunito, `@import` в файле); `mockup/assets/css/style.css` — альтернативный скин «Тёплый» (Shrikhand + IBM Plex Mono); `mockup/assets/js/skin-switcher.js` — переключатель: подменяет `href` **первого** `link[rel="stylesheet"]` на странице, выбор хранит в `localStorage` (ключ `julcraft-skin`).
- Окружение разработчика: Windows 11, Node v24.16.0, npm 11.17.0.
- `site/mockup/` **не создавать**: макет остаётся в корне репо (`../mockup` от site); приёмка идёт сверкой с ним. (Отступление от дерева §4 — осознанное, чтобы не дублировать файлы; при необходимости пересмотрим.)
- Коммиты — только по явной команде руководителя.

---

## Шаг 1 (T-1.1). Инициализация Next.js + копирование скинов

1. В пустой папке `site/` создать проект: `npx create-next-app@latest .` с параметрами: TypeScript + ESLint, App Router, **без Tailwind** (на вопрос про Tailwind ответить «нет»), без `src/` (структура по §4: `app/`, `components/`, `lib/`, `drizzle/`, `scripts/`, `public/` на верхнем уровне), алиас `@/*`. После установки проверить в `package.json`, что tailwind отсутствует.
2. Скопировать без изменений (проверить контрольной суммой):
   - `mockup/assets/css/style-memphis.css` → `site/public/css/style-memphis.css`
   - `mockup/assets/css/style.css` → `site/public/css/style.css`
   - `mockup/assets/js/skin-switcher.js` → `site/public/js/skin-switcher.js`
3. Подключение скинов — как в макете (`mockup/home.html` `<head>`): в корневом layout:
   - `<link rel="stylesheet" href="/css/style-memphis.css">` — первым (активный скин по умолчанию);
   - `<script src="/js/skin-switcher.js"></script>` — как в макете.
   - `<html lang="ru">`, метаданные через Next metadata API (title по умолчанию «JulCraft»).
4. **Критично для работы переключателя**: `skin-switcher.js` подменяет ПЕРВЫЙ `link[rel="stylesheet"]` в DOM. Поэтому:
   - **не импортировать никакие CSS в код** (удалить/не создавать `globals.css`-импорты и `next/font` — шрифты грузятся через `@import` внутри копий CSS, как в макете); единственным stylesheet-ссылкой на странице должна быть наша ссылка на скин;
   - `next/font` не использовать нигде.
5. Проверить механизм скинов вручную: переключатель в правом нижнем углу меняет скин, выбор сохраняется после перезагрузки, скин по умолчанию — «Мемфис».

## Шаг 2 (T-1.2). Базовый layout из `mockup/home.html` 1:1

1. `lib/settings.ts` — константы дефолтов Settings строго из макета (D-7; подключение к БД — этап 2):
   - `contacts.phone`: `tel:+380953584811`, отображение `+38 (095) 358 48 11`
   - `contacts.email`: `julcraft79@gmail.com`
   - `contacts.address`: `ул. Мстислава Скрипника, 40А`
   - `contacts.hoursWeekdays`: Понедельник — «выходной»; Вторник — Пятница — `11:00 — 20:00`; Суббота — `12:00 — 19:00`; Воскресенье — `12:00 — 17:00`
2. `components/layout/Header.tsx` (client-компонент) — копия `header.topbar` из home.html:
   - `a.logo` → «JulCraft» (ссылка `/`);
   - `nav`: Главная `/`, Каталог `/catalog`, Конфигуратор `/configurator`, О нас `/about`, Контакты `/contacts`; текущему маршруту — класс `is-active` (как в макете);
   - `div.actions`: `a.icon-btn` «☎» → `tel:+380953584811` с `title="Позвонить"`; `button.burger` «☰» (`aria-label="Меню"`) — открывает мобильное меню.
3. `components/layout/MobileMenu.tsx` (client) — копия `div.mobile-menu` из home.html: `mm-head` (бренд «JulCraft» + `button.icon-btn` «✕» закрыть), 5 ссылок `a.mm` (те же маршруты), `div.mm-foot` с текстом `ул. Мстислава Скрипника, 40А · ☎ +38 095 358 48 11`. Логика открытия/закрытия — класс `.open`, как в макете (в макете — inline-обработчики, в React — `useState`, поведение то же).
4. `components/layout/Footer.tsx` — копия `footer.footer` из home.html: `f-grid` из трёх колонок:
   - бренд: «JulCraft» + подпись `ул. Мстислава Скрипника, 40А · мастерская украшений · эст. 1976 (почти)`;
   - «Часы работы»: Понедельник — «выходной» (`.closed`), Вт — Пт `11:00 — 20:00`, Суббота `12:00 — 19:00`, Воскресенье `12:00 — 17:00` (подписи дней футера — именно «Вт — Пт», как в футере макета);
   - «Связаться»: `☎ +38 095 358 48 11` (tel), `✉ julcraft79@gmail.com` (mailto), `⛭ ул. Мстислава Скрипника, 40А` (ссылка `/contacts`), соц-иконки Instagram и Telegram — inline-SVG **копией из home.html**;
   - `f-copy`: `JulCraft · с 1976 года (почти) · © 2026`.
5. Корневой `app/layout.tsx`: `<Header/>` (с мобильным меню) + `{children}` + `<Footer/>`, как в макете страницы (topbar → mobile-menu → контент → footer).
6. Главная: роут-группа `app/(public)/`, страница `app/(public)/page.tsx` — статичная копия «вывески-героя» из home.html (данные не нужны): `div.signboard` (`p.est` «✹ эст. 1976 · открыто снова ✹», `h1` «JulCraft», `p.tag` «украшения · винтажная бижутерия · ремонт бабушкиных бус», `div.cta-row` с «Смотреть каталог» → `/catalog` и «Собрать своё» → `/configurator`) + `div.zigzag`. `<title>` страницы — из макета: `JulCraft — витрина · эст. 1976`.
   - Остальные блоки главной (витрина, плитка категорий, CTA-баннер, чек знакомства, часы) — Этап 3 (данные); на этом этапе их НЕ делать, чтобы не дублировать работу T-3.1.

## Шаг 3 (T-1.3). Drizzle + SQLite, миграции, env

1. Зависимости: `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `dotenv`, `tsx` (для скриптов).
2. `lib/db.ts` — подключение `better-sqlite3` по `DATABASE_URL` (формат `file:./julcraft.db` → путь к файлу в корне `site/`); экспорт `db`; при импорте в dev БД инициализируется автоматически.
3. `drizzle/schema.ts` — таблицы строго по §5 (имена, поля, типы; цены/сроки — integer в копейках/днях; enum — `text` + TS-union, без нативных sqlite-enum для лёгкого перехода на PostgreSQL):
   - `categories`: id, name, slug (unique), description, image (nullable), workPrice, baseWorkDays, hasSlotTemplate (boolean), isActive, sortOrder
   - `slotTemplates`: id, categoryId (FK→categories), name, componentType (`stone/pendant/bead/cord/clasp/base`), minQty, maxQty, sortOrder
   - `products`: id, categoryId (FK), name, slug (unique), description, price, images (json: text[]), isNew, isFeatured, availability (`in_stock/reserve/made_to_order/out_of_stock`), reserveUntil (nullable), orderDays (nullable), metaTitle/metaDescription/ogImage (nullable), createdAt/updatedAt
   - `components`: id, name, componentType, price, processingPrice, processingDays, stockQty, isOrderable (boolean), deliveryDays (nullable), photo, isActive
   - `orders`: id, type (`product/custom/contact`), customerName, contact, message, productId (FK→products, nullable), configJson (text), collagePath (nullable), calcPrice, calcDays, status (`new/in_progress/done/cancelled`), createdAt/updatedAt
   - `settings`: key (text PK), value (text)
   - Таблицу `productComponents` **не создавать** (вне MVP, §5).
4. `drizzle.config.ts`: dialect `sqlite`, `schema: './drizzle/schema.ts'`, `out: './drizzle'`, `dbCredentials.url` из `process.env.DATABASE_URL` (загрузка env через `dotenv`).
5. Скрипты в `package.json`: `db:generate` (drizzle-kit generate), `db:migrate` (drizzle-kit migrate или tsx-скрипт), плюс штатные `dev`/`build`/`start`/`lint` из скаффолда (работоспособность lint-скрипта проверить).
6. `.env.example`: `DATABASE_URL=file:./julcraft.db`; плейсхолдеры для будущих этапов: `ADMIN_LOGIN=`, `ADMIN_PASSWORD=`, `TELEGRAM_BOT_TOKEN=`, `TELEGRAM_CHAT_ID=` (D-12, этап 4 — сейчас не используются, только пример). Создать реальный `.env` локально.
7. `.gitignore`: `node_modules/`, `.next/`, `.env`, `*.db`, `public/uploads/`.
8. Сгенерировать и применить миграцию (`npm run db:generate`, `npm run db:migrate`) — `site/julcraft.db` создаётся со всеми таблицами. Экспортировать инференные TS-типы (`$inferSelect`) из schema — пригодятся на этапе 2.
9. Seed **не делать** (T-2.1 — этап 2).

---

## Критерии приёмки (этапа в целом)

1. `npm run dev` → `http://localhost:3000`: главная показывает каркас из макета — topbar, мобильное меню (открывается/закрывается бургером, на ≤820px навигация сворачивается в бургер), вывеска-герой, футер. Визуально соответствует `mockup/home.html` (структура и классы — 1:1).
2. Переключатель скинов работает: переключение «06 · Тёплый» ↔ «12 · Мемфис», запоминание в localStorage, дефолт — «Мемфис`. При переключении на странице остаётся ровно один загруженный скин.
3. Копии CSS/JS идентичны макету байт-в-байт (сверка хэшей); файлы `mockup/**` не изменены.
4. В `package.json` нет Tailwind/shadcn и прочих UI-фреймворков; в коде нет импортов CSS и `next/font`.
5. `npm run db:migrate` создаёт `site/julcraft.db` с таблицами `categories`, `slotTemplates`, `products` (в т.ч. `availability/reserveUntil/orderDays`), `components`, `orders`, `settings`; поле `inStock` отсутствует.
6. `npm run build` и `npm run lint` проходят без ошибок.

## Не делать (out of scope)

- Контент главной (витрина, категории, CTA, чек, часы) — T-3.1; остальные публичные страницы — Этап 3.
- Seed-данные — Этап 2. Админка, заявки, API, конфигуратор, uploads — Этапы 4–5.
- Правки CSS/JS макета, новые токены, новые компоненты/дизайн — запрещены золотыми правилами.
- Коммиты без команды руководителя.

## Порядок и отчёт

Выполнять последовательно: Шаг 1 → Шаг 2 → Шаг 3. По завершении — отчёт руководителю: что сделано, команды проверки, список созданных файлов, расхождения/вопросы (если есть). После подтверждения приёмки отметить чекбоксы T-1.1, T-1.2, T-1.3 в `plan-2.md` §8.