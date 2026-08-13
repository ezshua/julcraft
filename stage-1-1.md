# Этап 1.1 — Фундамент проекта (scaffold, Tailwind-тема, env, скрипты)

**Тип задачи:** инфраструктура / настройка проекта
**Зависимости:** нет (выполняется первым)
**Связанные пункты плана:** `plan-1.md` §3 (стек), §7 T-1.1 (scaffold) + T-1.3, решения D-8a, D-1a, D-3a

---

## Цель
Поднять пустой, но корректно сконфигурированный проект Next.js 14 + TypeScript + Tailwind, в который уже «зашита» дизайн-система по умолчанию (скин «Тёплое ручное тепло» из `work1206D/mockup/assets/css/style.css`). После этого этапа `npm run dev` запускает сайт, `npm run build` и lint проходят.

## Решения, которые нельзя нарушать
- **D-8a:** shadcn/ui **НЕ подключаем**. Все компоненты — кастомные на Tailwind-токенах.
- **D-1a:** рабочая база — таблица стилей по умолчанию (`style.css`). Финальный скин (вкл. «Мемфис») адаптируем в конце, решение отложено. Значит токены Tailwind берём из `style.css`, НЕ из `style-memphis.css` и НЕ из `design-system.html`.
- **D-3a:** sharp для коллажа не используется (понадобится позже только для оптимизации загрузок фото) — здесь не трогаем.

## Токены для Tailwind (извлечены из `style.css` `:root`)
Скопируйте точные значения в `tailwind.config.ts` → `theme.extend`:

**Цвета (colors):**
| токен | hex | назначение |
|---|---|---|
| `cream`  | `#f5edd8` | фон body, секций |
| `mustard`| `#d9a441` | акцент 1: кнопки CTA, цена, тени hover, бейджи |
| `rust`   | `#c05c33` | акцент 2: тени заголовков, «закрыто», hover-тени |
| `olive`  | `#6b7a3f` | второстепенный текст, часы, наличие |
| `brown`  | `#4a3226` | основной текст, границы, кнопки, footer |
| `white`  | `#ffffff` | карточки, чек (допустим только здесь) |
| `ink`    | `#22242a` | ТОЛЬКО штрих-код / мелочи |
| `paper`  | `#fdeed2` | бумага чека, панели |
| `paper2` | `#f2dfb6` | деревянная полка / вторая бумага |
| `muted`  | `#7a6653` | вторичный текст на светлом |
| `onDark` | `#e0cfa4` | текст на brown |
| `dot`    | `#c9b183` | пунктир чека/таблиц |
| `errBg`  | `#fbe9e2` | фон ошибочного поля |

**Шрифты (fontFamily):**
- `display`: `'Shrikhand', cursive` — заголовки, вывеска, ценники, бейджи
- `mono`/`sans`: `'IBM Plex Mono', monospace` — весь читаемый текст, UI, body

**Радиусы (borderRadius):** `item: 16px`, `form: 8px`
**Тени (boxShadow, жёсткие, без blur):**
- `item: '6px 6px 0 #d9a441'`
- `itemHover: '9px 9px 0 #c05c33'`
- `phone: '4px 4px 0 #4a3226'`
- `phoneHover: '6px 6px 0 #4a3226'`
- `board: '8px 8px 0 #c05c33'`
- `receipt: '8px 8px 0 rgba(0,0,0,.2)'`
- `chip: '3px 3px 0 rgba(0,0,0,.15)'`

**z-index:** `content:0`, `header:10`, `sticky:20`, `modal:50`, `burger:100`
**Контейнер:** макс. ширина `1080px`, отступы `4vw`
**Брейкпоинты (screens):** дефолт mobile-first; `md: 768px` (планшет 768–1079), `lg: 1080px`. Доп. логика ≤820/≤520 задаётся в компонентах через media-классы по необходимости (см. `style.css` §18).

## Шаги
1. **Скаффолд.** Создать Next.js 14 (App Router) + TypeScript + Tailwind + ESLint. Без `src/` (структура из §3: `app/`, `components/`, `lib/`, `drizzle/`, `scripts/`, `public/uploads/` на верхнем уровне). Алиас `@/*`.
2. **Tailwind-тема.** В `tailwind.config.ts` прописать `content` (`./app/**`, `./components/**`), `theme.extend` со всеми токенами выше.
3. **Глобальные стили.** `app/globals.css`: `@tailwind base/components/utilities;`, базовые правила body (`bg-cream text-brown font-mono`, `line-height:1.7`). НЕ добавлять конфетти-фон (это из скина «Мемфис», отложен).
4. **env.** Создать `.env.example`:
   ```
   DATABASE_URL="file:./julcraft.db"
   AUTH_SECRET=""
   TELEGRAM_BOT_TOKEN=""
   TELEGRAM_CHAT_ID=""
   UPLOAD_DIR="public/uploads"
   ```
5. **Скрипты** в `package.json`:
   - `dev`, `build`, `start` (из create-next-app)
   - `db:generate`: `drizzle-kit generate`
   - `db:migrate`: `drizzle-kit migrate`
   - `db:push`: `drizzle-kit push`
   - `seed`: `tsx scripts/seed.ts` (файл создаётся на этапе 2, здесь только прописать скрипт)
6. **Проверка токенов.** Временно в `app/page.tsx` (или отдельном тест-роуте) вывести `<div className="bg-cream text-brown font-display">JulCraft</div>` и убедиться, что Tailwind применил токены.

## Критерии приёмки
- `npm install` → `npm run dev` поднимает сайт (пусть пока пустой layout).
- `npm run build` проходит без ошибок.
- `npm run lint` чистый.
- В `tailwind.config.ts` присутствуют все цвета/шрифты/тени/радиусы/z-index из таблицы выше.
- shadcn/ui отсутствует в `package.json` и не импортируется.

## Не делать (out of scope)
- Слой БД / Drizzle — это **stage-1-2.md**.
- layout (header/footer) — **stage-1-3.md**.
- Любые страницы/компоненты витрины, админки, конфигуратора.
- Адаптацию финального скина «Мемфис» (отложена на конец).
