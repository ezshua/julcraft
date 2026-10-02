# Задание агенту — blog · 3: Загрузка изображений блога и снапшот

**Тип задачи:** инфраструктура
**Зависимости:** blog · 1
**Связанные пункты плана:** `plan-5-blog.md` §6 (API), §9 (граничные случаи), D-B15
**Файлы зоны:** `site/app/api/upload/route.ts`, `site/components/admin/ImageUploader.tsx`, `site/scripts/snapshot-capture.ts`, `site/scripts/check-snapshot.ts`

## Общие правила

- Ничего не ломать в существующих `kind` — products, components, categories, contacts.
- Тексты ошибок уже локализованы (`api.upload.*`) — новых ключей не нужно.
- `snapshot-capture.ts` и `check-snapshot.ts` содержат захардкоженные списки таблиц и папок — новые сущности обязаны попасть туда, иначе снапшот будет неполным.

## Задания

**3.1** `site/app/api/upload/route.ts`:
- `LIMITS.blog = { mime: ["image/jpeg", "image/png", "image/webp"], max: 5 * 1024 * 1024, ext: "auto" }`;
- файлы попадают в `site/public/uploads/blog/` (создаётся существующим `mkdir recursive`).

**3.2** `site/components/admin/ImageUploader.tsx`: добавить `"blog"` в тип `kind`.

**3.3** `site/scripts/snapshot-capture.ts`: в `TABLES` добавить `blogPosts`, `blogTags`, `blogPostTags`; в `UPLOAD_FOLDERS` добавить `blog`.

**3.4** `site/scripts/check-snapshot.ts`:
- все `coverImage` у записей — существующие файлы;
- все пути из `extractImagePaths(content)` — существующие файлы;
- счётчики записей и тегов в выводе;
- ни одной внешней ссылки (http/https) в `coverImage` и в тексте записей — как для товаров.

**3.5** Ручная проверка: загрузить три файла разных типов; проверить отказ по неверному MIME, отказ по лимиту 5 МБ и ответ 401 без сессии.

## Критерии приёмки

1. `npm run snapshot:check` зелёный.
2. Загрузка без сессии — 401; с лимитом больше 5 МБ — 400 с локализованным сообщением.
3. `npm run lint`, `npm run build` зелёные.

## Не делать

- Не менять лимиты и правила существующих `kind`.
- Не удалять файлы при удалении записи (вне v1, как у товаров).
