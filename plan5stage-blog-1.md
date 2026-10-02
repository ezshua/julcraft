# Задание агенту — blog · 1: Схема БД, миграция и слой данных

**Тип задачи:** данные + серверный слой
**Зависимости:** blog · 0
**Связанные пункты плана:** `plan-5-blog.md` §4 (модель данных), §5 (доступ к данным), §6 (валидация), D-B1, D-B2, D-B8, D-B9
**Файлы зоны:** `site/drizzle/schema.ts`, `site/drizzle/meta/*`, `site/drizzle/0004_*.sql`, `site/lib/blog.ts`, `site/lib/schemas.ts`, `site/scripts/check-blog.ts`, `site/package.json`

## Общие правила

- Живая БД не пересиживать: **первым делом** копия `site/julcraft.db` → `site/julcraft.db.pre-blog`.
- `npm run db:seed` — только с `DATABASE_URL=file:./tmp-seedtest.db`; временный файл после прогона удалить.
- zod-схемы — фабриками, сообщения берутся из словаря (`dict.admin.errors`), как в `productSchema`.
- Локализованные поля писать через `storeLS()`, читать через `L()`.
- 0 новых зависимостей на этом этапе.

## Задания

**1.1** `site/drizzle/schema.ts`:
- `BLOG_POST_STATUSES = ["draft", "published"] as const`, тип `BlogPostStatus`;
- таблицы `blogPosts`, `blogTags`, `blogPostTags` (состав полей — `plan-5-blog.md` §4);
- индекс `blogPosts_status_publishedAt_idx` по `(status, publishedAt)`;
- типы `BlogPost`, `NewBlogPost`, `BlogTag`;
- импорт `index` и `primaryKey` из `drizzle-orm/sqlite-core`.

**1.2** `site/lib/schemas.ts`:
- `blogPostSchema(errors)` — title (RU обязателен), slug (формат), excerpt, content (RU обязателен, min 1), coverImage, metaTitle, metaDescription, tagIds (массив положительных int, максимум 10);
- `blogPublishSchema` — `{ action: "publish" | "unpublish" }`;
- `blogTagCreateSchema` / `blogTagUpdateSchema` — name (локализованное, RU обязателен), sortOrder, isActive; код тега после создания не меняется (как у componentTypes).

**1.3** `site/lib/blog.ts`:
- приватный `PUBLISHED_FILTER = and(eq(status, "published"), lte(publishedAt, new Date()))`;
- `getPublishedPosts({year, month, tagSlug, page, perPage})` — фильтр, сортировка по убыванию даты, `PAGE_SIZE = 9`, группировка `buildPostGroups()`;
- `getPublishedPostBySlug(slug)`, `getAdjacentPosts(publishedAt)`;
- `getActiveTagsWithCounts()` — только активные теги, с числом опубликованных записей;
- админские: `getAllPostsForAdmin({status, tagSlug, q})`, `getPostForAdminById`, `getTagsForAdmin`, `getTagIdsForPost`;
- служебные: `setPostTags(postId, tagIds)` (upsert + удаление не-submitted), `isValidTagIds(ids)`.

**1.4** `site/scripts/check-blog.ts` + npm-скрипт `check:blog`:
- черновик не попадает в `getPublishedPosts()` и `getPublishedPostBySlug()`;
- запись без `publishedAt` — тоже не попадает;
- порядок по убыванию даты;
- группировка по годам и месяцам;
- пагинация (10 записей → 2 страницы по 9);
- фильтр по тегу и его отсутствие;
- `setPostTags` удаляет не-submitted связи; удаление тега чистит связи;
- проверки идут на временной БД (`DATABASE_URL` из окружения или аргумента), боевую не трогают.

**1.5** Миграция:
- `npm run db:generate` → `drizzle/0004_*.sql` + `meta/0004_snapshot.json` + запись в `_journal.json`;
- просмотреть сгенерированный SQL (три CREATE TABLE + два CREATE INDEX);
- `npm run db:migrate`; повторный запуск — no-op (идемпотентность);
- регресс демо-сида на временной БД: `db:seed` и `db:check` с переопределённым `DATABASE_URL`.

## Критерии приёмки

1. `check:blog` зелёный.
2. `npm run db:migrate` повторный запуск ничего не ломает.
3. Боевая БД на месте, копия `julcraft.db.pre-blog` создана до миграции.
4. Регресс демо-сида на временной БД проходит (`db:seed` + `db:check`).
5. `npm run lint`, `npm run build` зелёные.

## Не делать

- Не трогать витрину и админку — это этапы 4–7.
- Не добавлять поля «отложенная публикация» (вне v1, решение B6).
- Не включать `ON DELETE CASCADE`: `PRAGMA foreign_keys` в better-sqlite3 выключен, каскад не сработает.
