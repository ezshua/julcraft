# План направления 5: Блог мастера (JulCraft)

> Статус: утверждён 2026-09, к реализации с этапа 0.
> Новое направление: витрина блога для посетителей + редактор записей в панели мастера.
> Наследует золотые правила `plan-2.md` §0; декомпозиция по шагам — в `plan5stages-blog.md` и `plan5stage-blog-*.md`.

---

## 1. Зафиксированные решения (опрос 2026-09)

| # | Вопрос | Решение |
|---|---|---|
| **B1** | Макетов блога нет | **Этап 0 — сначала макеты**, потом перенос 1:1: `mockup/blog.html`, `mockup/blog-post.html`, `mockup/admin/blog.html`, `mockup/admin/blog-editor.html` |
| **B2** | Языки записей | **RU + EN + UK**, локализованные поля как у товаров (`LocalizedString` = JSON `{ru,en,uk}`, фолбэк RU) |
| **B3** | Markdown | **Библиотека**: `react-markdown@^10.1.0` + `remark-gfm@^4.0.1` в `dependencies`. Свой рендерер не пишем |
| **B4** | Предпросмотр | **Живой**, в редакторе, тем же компонентом, что и витрина |
| **B5** | Объём v1 | **Обложка** (`coverImage`) + **теги/рубрики** (`blogTags` + `blogPostTags`) |
| **B6** | Вне v1 | Отложенная публикация по будущей дате, RSS/Atom, комментарии, счётчик просмотров, блок блога на главной |
| **B7** | Пункт меню | Главная · Каталог · Конфигуратор · **Блог** · О нас · Контакты |
| **B8** | Главная страница | **Не меняется** в v1 |

**Проверено до планирования:**

- `react-markdown@10.1.0`: компонент `Markdown` — **синхронный, без хуков** (хуки только у `MarkdownHooks`) → один и тот же компонент работает и в серверном компоненте витрины, и в клиентском предпросмотре.
- Сырой HTML без `rehype-raw` превращается в текст → XSS невозможен; `href` и `src` проходят через `defaultUrlTransform` (небезопасный протокол → пустая строка).
- Оба пакета ESM-only, `react-markdown` требует `react >= 18` — совместимы с React 19.2.8 и Next 16.3.1.

---

## 2. Цель и критерии успеха

**Цель.** Мастер пишет заметки в панели, загружает картинки, размечает markdown, вешает теги, публикует и снимает с публикации. Посетитель видит опубликованные записи во вкладке «Блог» с группировкой по датам и фильтром по тегу. Черновики не видит никто, кроме мастера.

**Критерии приёмки всего направления** (отмечены по итогам этапа 8, 2026-09):

- [x] 1. `/blog` в главном и мобильном меню (позиция — B7), записи открываются по `/blog/<slug>`.
- [x] 2. Список сгруппирован по годам и месяцам, есть навигация год → месяц, фильтр по тегу, пагинация (по образцу `site/app/(public)/catalog/[slug]/page.tsx`).
- [x] 3. Редактор: markdown с живым предпросмотром, загрузка картинок, вставка картинки в текст, выбор тегов, кнопки Сохранить / Опубликовать / Снять с публикации.
- [x] 4. **Черновик не отдаётся публично ни при каких условиях**: нет в списке, `/blog/<slug>` отдаёт 404, нет в `sitemap.xml`.
- [x] 5. `npm run lint`, `npm run build`, `npm run check:i18n`, `npm run check:markdown`, `npm run check:blog`, `npm run db:check` — зелёные.
- [x] 6. Публичная вёрстка — 1:1 с согласованными макетами; стили блога есть **в обоих** скинах (`site/public/css/style-memphis.css` и `site/public/css/style.css`).

---

## 3. Технические решения

| # | Решение | Обоснование |
|---|---|---|
| D-B1 | Три таблицы: `blogPosts`, `blogTags`, `blogPostTags` | Теги — по решению B5; связи чистим в коде, а не через `ON DELETE CASCADE`, потому что better-sqlite3 не включает `PRAGMA foreign_keys` |
| D-B2 | Публичный доступ к записям — **только** через `site/lib/blog.ts`; каждая публичная функция фильтрует `status='published' AND publishedAt <= now` через общий `PUBLISHED_FILTER` | Единственная точка, где можно нарушить правило «черновик не виден» |
| D-B3 | Черновик на публичной странице даёт `notFound()` (404, а не 403) | Не выдаёт факта существования записи |
| D-B4 | Один компонент `<MarkdownBody source={...} />` и на витрине, и в предпросмотре | Предпросмотр тождественен витрине; react-markdown синхронный, хуков нет |
| D-B5 | Никаких `dangerouslySetInnerHTML` и санитайзеров | react-markdown рендерит React-элементы; сырой HTML превращается в текст; URL фильтрует `defaultUrlTransform` |
| D-B6 | Локализованы `title`, `excerpt`, `content`, `metaTitle`, `metaDescription`, `blogTags.name`; **не** локализованы `slug`, `coverImage`, `blogTags.slug` | Как у товаров: одна картинка на все локали |
| D-B7 | Редактор — **отдельная страница** `/admin/blog/new` и `/admin/blog/[id]`, а не модалка | Двухпанельный редактор с тулбаром и предпросмотром не помещается в паттерн модалок |
| D-B8 | Статусы только `draft` и `published`; отложенной публикации нет (B6). `publishedAt` ставится один раз при публикации и сохраняется при снятии | Нет третьего статуса и ручной даты — меньше состояний и ошибок |
| D-B9 | `slug` генерируется из RU-заголовка через `slugify()` (автоподстановка, пока поле не правили руками), редактируется, уникальность проверяется на сервере | Готовый `slugify` плюс готовый паттерн проверки |
| D-B10 | Картинки внутри markdown — обычный `<img loading="lazy">` через кастомный компонент `img`, **не** `next/image` | В markdown нет размеров; `next/image` без `width/height` требует `fill`-обёртки и ломает поток абзаца. В файле отключается правило eslint `@next/next/no-img-element` |
| D-B11 | Одиночный перенос строки внутри абзаца **не** даёт `<br>` (CommonMark), `remark-breaks` не подключаем | Один меньший пакет; при желании — однострочное изменение позже |
| D-B12 | Внешние ссылки в тексте открываются в новой вкладке через кастомный компонент `a` (`target="_blank" rel="noopener noreferrer"`) | Гигиена ссылок мастера |
| D-B13 | Стили `.prose`, `.blog-*`, `.md-*` дописываются **в конец обоих** CSS-скинов копией из макетов | Оба скина поддерживаются переключателем |
| D-B14 | Публикация — отдельный `POST .../publish`; `unpublish` возвращает `draft`, `publishedAt` сохраняется | Однозначная кнопка в UI |
| D-B15 | Картинки в `site/public/uploads/blog/`, `kind="blog"` (jpeg/png/webp, 5 МБ) | Продолжение существующего `kind`-механизма |

---

## 4. Модель данных

```ts
// site/drizzle/schema.ts
export const BLOG_POST_STATUSES = ["draft", "published"] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export const blogPosts = sqliteTable(
  "blogPosts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),                 // LocalizedString
    excerpt: text("excerpt").notNull().default(""),  // LocalizedString
    content: text("content").notNull().default(""),  // LocalizedString, markdown
    coverImage: text("coverImage"),                  // "/uploads/blog/..." | null
    status: text("status").$type<BlogPostStatus>().notNull().default("draft"),
    publishedAt: integer("publishedAt", { mode: "timestamp" }),
    metaTitle: text("metaTitle"),                    // LocalizedString | null
    metaDescription: text("metaDescription"),        // LocalizedString | null
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("blogPosts_status_publishedAt_idx").on(t.status, t.publishedAt)],
);

export const blogTags = sqliteTable("blogTags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),                      // LocalizedString
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
});

export const blogPostTags = sqliteTable(
  "blogPostTags",
  {
    postId: integer("postId").notNull().references(() => blogPosts.id),
    tagId: integer("tagId").notNull().references(() => blogTags.id),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogTag = typeof blogTags.$inferSelect;
```

Индекс `blogPosts(status, publishedAt)` — под сортировку витрины. Уникальный индекс `blogTags(slug)` создаётся полем `unique`.

**Связи чистим в коде**, как уже сделано для слотов категории: при удалении записи удаляем её строки из `blogPostTags`, при удалении тега — все его связи. `PRAGMA foreign_keys` в better-sqlite3 выключен, поэтому `ON DELETE CASCADE` не сработает.

---

## 5. Доступ к данным — `site/lib/blog.ts`

```ts
// Публичные — единственный путь к записям для витрины
getPublishedPosts(opts?: { year?, month?, tagSlug?, page?, perPage? }):
  { posts: BlogPost[]; total: number; pages: number; page: number;
    groups: { year: number; month: number; posts: BlogPost[] }[] }
getPublishedPostBySlug(slug: string): BlogPost | undefined
getAdjacentPosts(publishedAt: Date): { prev: BlogPost | null; next: BlogPost | null }
getActiveTagsWithCounts(): { slug: string; name: string; count: number }[]

// Админские — без фильтра по статусу
getAllPostsForAdmin(opts?: { status?: "all" | "draft" | "published"; tagSlug?: string; q?: string }): BlogPost[]
getPostForAdminById(id: number): BlogPost | undefined
getTagsForAdmin(): { id, slug, name, sortOrder, isActive, postCount }[]
getTagIdsForPost(postId: number): number[]

// Служебное
setPostTags(postId: number, tagIds: number[]): void   // upsert + удалить не-submitted
isValidTagIds(ids: number[]): boolean
```

Все публичные функции используют общий приватный `PUBLISHED_FILTER = and(eq(status,"published"), lte(publishedAt, new Date()))` и сортировку `orderBy(desc(publishedAt), desc(id))`. Пагинация — `PAGE_SIZE = 9`, как в категории. Фильтр по тегу — по подмножеству id из `blogPostTags`.

---

## 6. API

Все админские обработчики начинаются с `requireAdmin()` (иначе 401) и берут словарь через `getDictionary(await getLocale())`.

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/api/admin/blog` | список для админки со всеми статусами |
| `POST` | `/api/admin/blog` | создать запись (всегда `status='draft'`, `publishedAt=null`), ответ `{id}` |
| `GET` | `/api/admin/blog/[id]` | запись и её `tagIds` |
| `PUT` | `/api/admin/blog/[id]` | сохранить поля и `tagIds`; не трогает `status` и `publishedAt`; обновляет `updatedAt` |
| `DELETE` | `/api/admin/blog/[id]` | удалить запись и её связи с тегами |
| `POST` | `/api/admin/blog/[id]/publish` | `{action:"publish"|"unpublish"}`: publish ставит `status='published'` и `publishedAt = publishedAt ?? now`, unpublish возвращает `status='draft'` |
| `GET` | `/api/admin/blog/tags` | список тегов со счётчиками записей |
| `POST` | `/api/admin/blog/tags` | создать тег: `slug` из `slugify(firstLocale(name))` плюс проверка уникальности |
| `PUT` | `/api/admin/blog/tags/[id]` | переименовать, переключить активность, задать порядок |
| `DELETE` | `/api/admin/blog/tags/[id]` | удалить тег и все его связи |
| `GET` | `/api/admin/blog/media` | файлы из `site/public/uploads/blog/` в виде `{name, path}`, сортировка по имени убыв |
| `POST` | `/api/upload` | **уже существует**, добавляется `kind="blog"` |

**Валидация** — фабриками в `site/lib/schemas.ts` по образцу `productSchema(errors)`: `title` через `localizedNameSchema` (RU обязателен); `slug` по регулярке и с проверкой уникальности (`admin.errors.slugTaken`); `excerpt` через `localizedDescriptionSchema`; `content` — RU обязателен, минимум один символ; `coverImage` как `nullableString`; `metaTitle` и `metaDescription` как `localizedNullableString`; `tagIds` — массив положительных целых, максимум 10, дополнительно проверяются на существование (по образцу `isValidComponentTypeCode` для слотов). При `publish` проверяется непустота `title` и `content`, иначе 400 с локализованным сообщением.

---

## 7. Markdown-подсистема

**Зависимости (dependencies):** `react-markdown@^10.1.0` и `remark-gfm@^4.0.1`. Установку выполнять с доступным npm-кэшем: в песочнице агента кэш заблокирован, поэтому `npm i` может потребовать запуска вне неё.

**`site/components/blog/MarkdownBody.tsx`** — компонент без директивы client, используется и серверным компонентом витрины, и клиентским предпросмотром:

- плагин `remarkGfm`;
- кастомный `img` даёт `<img loading="lazy" decoding="async" className="prose-img">` (D-B10), в шапке файла отключается правило eslint про img;
- кастомный `a` внешним ссылкам добавляет `target="_blank" rel="noopener noreferrer"` (D-B12);
- обёртка с классом `.prose`.

Поддерживаемый синтаксис (GFM): заголовки, **жирный**, *курсив*, ~~зачёркнутый~~, `код`, блоки кода, маркированные и нумерованные списки, списки задач, таблицы, цитаты, ссылки, картинки, автоссылки, разделитель. Одиночный перенос строки не даёт `<br>` (D-B11).

**`site/lib/markdown-utils.ts`** — маленькие утилиты без рендеринга:

- `stripMarkdown(src)` — чистый текст для авто-`metaDescription` (первые 160 символов);
- `extractImagePaths(src)` — пути картинок из текста (нужно `check-snapshot.ts`).

**`site/scripts/check-markdown.ts`** и скрипт `check:markdown` — `node:assert/strict` как в `site/scripts/check-product-image.ts`: проверка `stripMarkdown` на размеченном тексте, `extractImagePaths` на трёх форматах, плюс smoke-тест `MarkdownBody` через `react-dom/server` (`renderToStaticMarkup`): тег `script` не появился в HTML, ссылка с протоколом `javascript:` получила пустой `href`, таблица разметилась в `table`, зачёркивание разметилось в `del`.

**Стили `.prose`** — копией из макета в оба скина: заголовки, абзацы, списки (включая task-list), цитаты, код и преформатированный блок, таблицы, картинки (`max-width:100%`, скругление в духе `.item`), ссылки (подчёркивание цветом `--rust`), разделитель.

---

## 8. Карта этапов

`plan5stages-blog.md` — реестр этапов 0–8; `plan5stage-blog-<N>.md` — задание агенту на этап N (по образцу `plan3stage-*.md`).

| Этап | Содержание | Файл задания | Зависит от |
|---|---|---|---|
| **0** | План в репозитории + макеты блога | `plan5stage-blog-0.md` | — |
| **1** | Схема БД, миграция, `lib/blog.ts`, zod, `check:blog` | `plan5stage-blog-1.md` | 0 |
| **2** | Markdown: зависимости, `MarkdownBody`, `markdown-utils`, `check:markdown`, стили `.prose` | `plan5stage-blog-2.md` | 1 |
| **3** | Загрузка картинок блога + снапшот | `plan5stage-blog-3.md` | 1 |
| **4** | Витрина `/blog`: страница, меню, фильтр тегов, даты, словари, sitemap | `plan5stage-blog-4.md` | 1, 2 |
| **5** | Страница записи `/blog/[slug]`: рендер, SEO, теги, prev/next | `plan5stage-blog-5.md` | 2, 4 |
| **6** | Админка: API записей и тегов, список, вкладка «Теги» | `plan5stage-blog-6.md` | 1, 3 |
| **7** | Админка: редактор, предпросмотр, выбор тегов, публикация | `plan5stage-blog-7.md` | 2, 6 |
| **8** | Сквозная приёмка, демо-сид, документы деплоя | `plan5stage-blog-8.md` | 4–7 |

Порядок: 1 → 2 → {4 → 5}, {6 → 7}; 3 параллелен 2; 8 последний.

---

## 9. Сквозные правила и граничные случаи

**Правила (из `plan-2.md` §0 и `plan3stages.md`):**

1. Макет — источник истины; вёрстка переносится копированием, свои компоненты не изобретаются.
2. Ключи добавляются сразу во все три словаря; `npm run check:i18n` зелёный на каждом шаге.
3. Живая БД — боевой экземпляр: перед `db:migrate` копия файла; `db:seed` только с `DATABASE_URL` на временной БД.
4. Новые зависимости — только `react-markdown` и `remark-gfm` (решение B3); в `package.json` также добавляются скрипты `check:markdown` и `check:blog`.
5. Каждый админский обработчик вызывает `requireAdmin()`; каждая новая строка в UI берётся из словаря.
6. Перед кодом маршрутов прочитать гайды из `site/node_modules/next/dist/docs/01-app/01-getting-started/` — route-handlers, revalidating, caching, metadata-and-og-images (правило `site/AGENTS.md`).
7. Коммиты — только по явной команде.

**Граничные случаи (обязательно покрыть):**

- Пост без RU-текста → публикация отклоняется с локализованной ошибкой, черновик при этом сохраняется.
- EN и UK не заполнены → витрина показывает RU, пустых заголовков нет.
- `?y=2026` без `m` → все месяцы года; `?y=9999` (пусто) → пустое состояние, не 500; `?page=999` → последняя страница; неизвестный `?tag=xxx` → пустое состояние.
- Смена slug у опубликованной записи → старый URL даёт 404 (редиректов нет; если понадобятся — отдельное решение).
- Загрузка больше 5 МБ или неверного MIME → сообщение из словаря `api.upload.*`.
- Удаление запись с картинками — файлы остаются в `uploads/blog` (как у товаров), чистка вне v1; удаление тега чистит только связи, записи остаются.
- Повторное нажатие «Опубликовать» — дата публикации не перетирается.
- Запись без обложки — плейсхолдер в списке, сломанных картинок нет.
- Запись со 100+ картинками — предпросмотр не подвисает (debounce около 200 мс или `useDeferredValue`).
- Тег, снятый с активности, не показывается в фильтре витрины, но остаётся у уже опубликованных записей.

---

## 10. Файлы направления (сводка)

**Новые:**

- `site/lib/blog.ts`, `site/lib/markdown-utils.ts`
- `site/components/blog/MarkdownBody.tsx`, `PostCard.tsx`, `PostGroup.tsx`, `DateNav.tsx`, `TagFilter.tsx`, `BlogEmpty.tsx`
- `site/app/(public)/blog/page.tsx`, `site/app/(public)/blog/[slug]/page.tsx`
- `site/app/admin/(panel)/blog/page.tsx`, `site/app/admin/(panel)/blog/new/page.tsx`, `site/app/admin/(panel)/blog/[id]/page.tsx`
- `site/components/admin/BlogEditor.tsx`, `MarkdownField.tsx`, `BlogTagsManager.tsx`
- `site/app/api/admin/blog/route.ts`, `site/app/api/admin/blog/[id]/route.ts`, `site/app/api/admin/blog/[id]/publish/route.ts`, `site/app/api/admin/blog/tags/route.ts`, `site/app/api/admin/blog/tags/[id]/route.ts`, `site/app/api/admin/blog/media/route.ts`
- `site/scripts/check-markdown.ts`, `site/scripts/check-blog.ts`
- `site/drizzle/0004_*.sql` с meta-снапшотом
- `mockup/blog.html`, `mockup/blog-post.html`, `mockup/admin/blog.html`, `mockup/admin/blog-editor.html`
- `plan-5-blog.md`, `plan5stages-blog.md`, `plan5stage-blog-0.md` … `plan5stage-blog-8.md`

**Изменяемые:**

- `site/drizzle/schema.ts`, `site/drizzle/meta/_journal.json`
- `site/lib/schemas.ts`, `site/lib/dictionaries/ru.ts`, `site/lib/dictionaries/en.ts`, `site/lib/dictionaries/uk.ts`
- `site/components/layout/nav-links.ts`, `site/components/admin/AdminHeader.tsx`, `site/components/admin/ImageUploader.tsx`
- `site/app/api/upload/route.ts`, `site/app/sitemap.ts`
- `site/public/css/style.css`, `site/public/css/style-memphis.css`
- `site/scripts/seed.ts`, `site/scripts/check-seed.ts`, `site/scripts/snapshot-capture.ts`, `site/scripts/check-snapshot.ts`
- `site/package.json`, `mockup/index.html`, `docs/deploy-snapshot.md`, `README-deploy.md`

---

## 11. Открытые пункты (требуют руководителя)

1. Утвердить макеты этапа 0 до старта кода этапов 1+.
2. Подтвердить, что `react-markdown` и `remark-gfm` ставятся в `dependencies`, и решить, кто выполняет `npm i`: в песочнице агента npm-кэш заблокирован (EPERM в `AppData\Local\npm-cache`), поэтому команду придётся запускать вне песочницы.

---

## Журнал изменений

| Дата | Изменение |
|---|---|
| 2026-09 | Создан `plan-5-blog.md` по итогам опроса (B1–B8); этап 0 в работе |
| 2026-09 | **Этап 0 принят:** макеты `mockup/blog.html`, `blog-post.html`, `admin/blog.html`, `admin/blog-editor.html` утверждены; коммит `3572239` |
| 2026-09 | **Этап 1 принят:** таблицы `blogPosts`/`blogTags`/`blogPostTags` + миграция `0004_wakeful_red_shift`, `lib/blog.ts`, zod-схемы блога, `check:blog` (63 проверки). Правила `check:i18n` (801 ключ), `db:seed`+`db:check` на временной БД и `build` зелёные |
| 2026-09 | Этап 1: `npm run lint` по изменённым файлам чист; ошибки в `components/admin/CategoryList.tsx` — ранее существовавшие (`react-hooks/refs`), не трогались |
| 2026-09 | **Этапы 3–7 реализованы:** загрузка картинок блога (`kind="blog"`, `uploads/blog`) + снапшот (TABLES/UPLOAD_FOLDERS); витрина `/blog` и страница `/blog/<slug>`; админ-API записей/рубрик/медиа и страница `/admin/blog`; редактор `/admin/blog/new` и `/admin/blog/[id]` с markdown-панелью и живым предпросмотром; пункт «Блог» в меню сайта и панели |
| 2026-09 | **Этап 8 принят:** демо-сид блога (3 рубрики, 4 опубликованные записи с EN/UK у двух, 1 черновик; обложки — файлы из `uploads/products/`), ассерты блока в `check:seed`, документы деплоя дополнены. Сквозная приёмка: 59 проверок по HTTP на временной БД (меню, список, запись, EN/UK-фолбэк, оба скина, редактор, панель), sitemap на сборке с демо-БД — 4 записи без черновика; `check:i18n` (946), `check:markdown` (55), `check:blog` (63), `db:check`, `snapshot:check`, `lint` (только до-блоговые ошибки), `build` — зелёные |
