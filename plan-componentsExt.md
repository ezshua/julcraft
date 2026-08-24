# План: редактируемые типы комплектующих (component types)

> Цель: вынести жёстко заданный список из 6 типов комплектующих
> (`stone`, `pendant`, `bead`, `cord`, `clasp`, `base`) из кода в
> редактируемые данные, чтобы администратор мог добавлять, переименовывать,
> менять порядок и деактивировать/удалять типы через админку — без правки
> исходников.

---

## 1. Текущее состояние (что меняем)

| Что | Где | Комментарий |
|-----|-----|-------------|
| Источник истины — массив из 6 типов | `site/drizzle/schema.ts:4` `export const COMPONENT_TYPES = [...] as const` | Жёстко в коде |
| Тип `ComponentType` | `site/drizzle/schema.ts:5` `(typeof COMPONENT_TYPES)[number]` | Производный от массива |
| Валидация входа | `site/lib/schemas.ts:37` и `:54` `z.enum(COMPONENT_TYPES)` | Отвергает всё вне 6 значений |
| Подписи типов (админ) | `site/components/admin/ComponentModal.tsx:16` `TYPE_OPTIONS` | Жёстко в коде |
| Выбор типа слота в категории | `site/components/admin/CategoryEditor.tsx:5,252` (использует `TYPE_OPTIONS`) | Жёстко в коде |
| Фильтры/теги в админке комплектующих | `site/app/admin/(panel)/components/page.tsx:18-35` `TYPE_FILTERS`/`TYPE_TAGS` | Жёстко в коде |
| Хранение у комплектующего | `site/drizzle/schema.ts:80` `components.componentType` (text) | Сейчас пишется код из 6 значений |
| Хранение у слота категории | `site/drizzle/schema.ts:36` `slotTemplates.componentType` (text) | То же самое |
| Seed | `site/scripts/seed.ts` (строки ~106-198) — литеральные коды типов | Нужно обновить под новую таблицу |
| Публичный вывод (подписи) | `TYPE_OPTIONS` используется только в админке; публичные места показывают либо код, либо захардкоженный текст (см. `configurator/page.tsx:46`) | Нужно проверить и вынести подписи |

ВАЖНО: тип компонента хранится как **текстовый код** (`stone`, …). Менять
названия (подписи) безопасно; менять сам **код** ломает ссылки из
`components` и `slotTemplates`. Поэтому стабильным идентификатором типа
остаётся `code` (как `slug` у категорий), а редактируемым — человекочитаемое
имя.

---

## 2. Подход

Добавить таблицу `componentTypes` (аналог `categories`). В `components` и
`slotTemplates` колонка `componentType` **остаётся текстовой** и хранит `code`
типа. Всю «жёсткость» убираем: валидацию и выпадающие списки строим по
данным из БД.

Решения по реализации:
- **Таблица, а не settings-ключ** — ради поддержки порядка сортировки,
  флага активности и целостности (внешние ключи/проверки ссылок).
- `COMPONENT_TYPES` оставить только как **fallback по умолчанию** на случай
  пустой таблицы (чтобы сайт не падал до сидирования). Везде, где сейчас
  используется массив, брать данные из БД, а при пустой таблице — fallback.
- `ComponentType` превратить в `string` (или `z.string()`), чтобы тип не
  зависел от константы.

---

## 3. Шаги реализации

### 3.1. Схема и миграция
1. В `site/drizzle/schema.ts` добавить:
   ```ts
   export const componentTypes = sqliteTable("componentTypes", {
     id: integer("id").primaryKey({ autoIncrement: true }),
     code: text("code").notNull().unique(),      // стабильный id (stone, …)
     name: text("name").notNull(),               // «Камень», «Подвеска» …
     sortOrder: integer("sortOrder").notNull().default(0),
     isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
   });
   export type ComponentTypeRow = typeof componentTypes.$inferSelect;
   ```
2. `ComponentType` (строковый псевдо-тип) оставить/сделать `string`.
   `COMPONENT_TYPES` пометить как `DEPRECATED` (оставить для fallback).
3. Сгенерировать миграцию: `npm run db:generate` (drizzle-kit).
   Проверить `site/drizzle/meta/*_snapshot.json` и SQL-файл.
4. Применить: `npm run db:migrate`.

> Перед любыми правками Next.js прочитать актуальные гайды в
> `node_modules/next/dist/docs/` (требование `AGENTS.md`): структура файлов,
> server/client components, API routes могут отличаться от привычных.

### 3.2. Seed
- В `site/scripts/seed.ts` добавить вставку 6 типов с **точно теми же
  кодами** (`stone`, `pendant`, `bead`, `cord`, `clasp`, `base`), русскими
  именами и `sortOrder` 0..5. Существующие литералы в `components`/`slots`
  продолжат ссылаться на те же коды — обратная совместимость сохранена.
- При повторном сидировании типы либо upsert по `code`, либо
  пропускаются, если уже есть.

### 3.3. Общий доступ к типам (server)
- В `site/lib/` добавить `component-types.ts`:
  - `getComponentTypes(): ComponentTypeRow[]` — `db.select().from(componentTypes).orderBy(sortOrder)`.
  - `getActiveComponentTypes()` — только `isActive`.
  - `getTypeLabel(code): string` — поиск по коду, fallback на `code`.
- Заменить `COMPONENT_TYPES` в местах валидации:
  - `site/lib/schemas.ts:37,54` — вместо `z.enum(COMPONENT_TYPES)` сделать
    `z.string()` + server-side проверку, что код существует в
    `componentTypes` (или входит в fallback-набор, если таблица пуста).
    Удобно: в схеме компонента/слота принимать `componentType: z.string().min(1)`.

### 3.4. API для админки
Создать `site/app/api/admin/component-types/`:
- `GET` — список типов (для выпадающих списков в админке).
- `POST` — создать (`code` уникален, `code` обязателен, валидировать
  формат, напр. `[a-z0-9-]+`).
- `PUT /[id]` и `DELETE /[id]` — обновить/удалить.
- `DELETE` **блокировать 409**, если есть `components` или
  `slotTemplates` с этим `code` (сообщение: «Сначала переназначьте N
  комплектующих / M слотов»). Удаление кода ломает данные — запрещено.
- Защита через `requireAdmin()` (как в `site/app/api/admin/settings/route.ts`).
- Добавить ключи в любой используемый список разрешённых маршрутов, если
  есть центральная проверка.

### 3.5. Админский UI — раздел «Типы комплектующих»
- Новая страница `site/app/admin/(panel)/component-types/page.tsx`
  (ссылку добавить в навигацию админки рядом с «Комплектующие»).
- Функциональность (по аналогии с `categories`/`components`):
  - список типов с порядком и флагом активности;
  - добавление (код + имя + порядок + активность);
  - редактирование имени, порядка, `isActive`, **но не кода** (код
    менять нельзя — ломает ссылки); при необходимости смены кода —
    удалить и создать новый;
  - удаление с проверкой ссылок (см. 3.4).
- Использовать существующие паттерны: `Modal`, `DeleteButton`,
  `useRouter().refresh()` после сохранения (см. `SettingsPanel.tsx`,
  `ComponentModal.tsx`).

### 3.6. Заменить жёсткие выпадающие списки на данные из БД
- `site/components/admin/ComponentModal.tsx`
  - `TYPE_OPTIONS` (строка 16) — убрать; получать список активных типов
    (передавать пропсом из страницы `components/page.tsx` через
    `getComponentTypes()` на сервере, или через `fetch('/api/admin/component-types')` на клиенте).
  - Поле «Тип (componentType)» рендерить из этого списка.
- `site/components/admin/CategoryEditor.tsx`
  - Импорт `TYPE_OPTIONS` (строка 5) заменить на список из БД.
  - Селект типа слота (строка 245-252) — из БД.
- `site/app/admin/(panel)/components/page.tsx`
  - `TYPE_FILTERS`/`TYPE_TAGS` (строки 18-35) — строить из
    `getComponentTypes()` (или оставить теги по умолчанию, но фильтры по
    типу — из БД).

### 3.7. Публичная часть (подписи типов)
- Найти все места, где `componentType` показывается пользователю
  (конфигуратор, карточки заказа и т.п.). Использовать `getTypeLabel(code)`
  вместо захардкоженного текста.
- Проверить `site/app/(public)/configurator/page.tsx` и маршрут
  `configurator/[slug]` (если существует — в каталоге найден только
  `configurator/page.tsx`, убедиться, что вложенный маршрут не сломан).
- Если в публичке типы не выводятся явно — убедиться, что ничего не сломалось.

### 3.8. Очистка
- Везде, где `COMPONENT_TYPES` больше не нужен для логики, заменить на
  данные БД; оставить константу только как fallback в
  `getComponentTypes()` при пустой таблице (с пометкой DEPRECATED).

---

## 4. Граничные случаи
- **Удаление используемого типа** — запретить (409), пока есть ссылки.
- **Смена кода** — запретить редактирование `code` (он — стабильный id).
- **Пустая таблица** (до сида) — fallback на `COMPONENT_TYPES`, чтобы сайт
  не падал.
- **`isActive = false`** — тип скрывается из выпадающих списков при создании
  новых комплектующих/слотов, но существующие записи с ним остаются
  валидными (не ломать исторические данные).
- **Порядок сортировки** — учитывать `sortOrder` во всех выпадающих списках.

---

## 5. Проверка (verification)
1. `npm run lint` — ESLint без ошибок.
2. `npm run build` — сборка Next.js (выполняет проверку типов).
3. `npm run db:generate` → `npm run db:migrate` → `npm run db:seed` →
   `npm run db:check` (если применимо).
4. `npm run dev` и ручная проверка:
   - Админка → «Типы комплектующих»: добавить, переименовать, поменять
     порядок, деактивировать, попытаться удалить используемый тип
     (ожидаем отказ) и неиспользуемый (успех).
   - В форме комплектующего и в редакторе слотов категории выпадающий
     список типов совпадает с отредактированным набором.
   - После сида сайт визуально не изменился (те же 6 типов, те же подписи).
   - Публичный конфигуратор/вывод типов корректно показывает подписи.

---

## 6. Ориентировочный список файлов
- `site/drizzle/schema.ts` — таблица `componentTypes`, `ComponentType`.
- `site/drizzle/meta/*` — сгенерированная миграция.
- `site/scripts/seed.ts` — сидирование типов.
- `site/lib/schemas.ts` — валидация `componentType`.
- `site/lib/component-types.ts` (новый) — `getComponentTypes`, `getTypeLabel`.
- `site/app/api/admin/component-types/route.ts` + `[id]/route.ts` (новые).
- `site/app/admin/(panel)/component-types/page.tsx` (новая) + навигация.
- `site/components/admin/ComponentModal.tsx` — список типов из БД.
- `site/components/admin/CategoryEditor.tsx` — список типов из БД.
- `site/app/admin/(panel)/components/page.tsx` — фильтры из БД.
- Публичные места вывода `componentType` (конфигуратор и др.) — подписи.
