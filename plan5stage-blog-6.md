# Задание агенту — blog · 6: Админка — API записей и тегов, список

**Тип задачи:** админский CRUD (server + client)
**Зависимости:** blog · 1, blog · 3
**Связанные пункты плана:** `plan-5-blog.md` §6 (API), §9; D-B8, D-B9, D-B14
**Файлы зоны:** `site/app/api/admin/blog/**`, `site/app/admin/(panel)/blog/page.tsx`, `site/components/admin/BlogTagsManager.tsx`, `site/components/admin/AdminHeader.tsx`, `site/lib/dictionaries/{ru,en,uk}.ts`

## Общие правила

- Каждый обработчик начинается с `requireAdmin()` (иначе 401) и берёт словарь через `getDictionary(await getLocale())` — как в существующих маршрутах.
- Валидация — zod-схемами из словаря; локализованные поля писать через `storeLS()`.
- Перед кодом прочитать `site/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (правило `site/AGENTS.md`).
- Образец для списка — `app/(public)/components` и `app/api/admin/categories/**`; образец вложенной сущности с тегами — `componentTypes`.
- Стили берутся из `mockup/admin/blog.html` и дописываются в оба скина.

## Задания

**6.1** `site/app/api/admin/blog/route.ts`:
- `GET` — список записей со всеми статусами и их тегами;
- `POST` — создать запись (всегда `draft`, `publishedAt = null`), ответ `{ id }`.

**6.2** `site/app/api/admin/blog/[id]/route.ts`:
- `GET` — запись + `tagIds`;
- `PUT` — сохранить поля и `tagIds` (`setPostTags`), обновить `updatedAt`, не трогать `status` и `publishedAt`; проверка уникальности slug;
- `DELETE` — удалить запись и её строки из `blogPostTags`.

**6.3** `site/app/api/admin/blog/[id]/publish/route.ts`:
- `publish` → `status='published'`, `publishedAt = publishedAt ?? now` (повторное нажатие дату не перетирает);
- `unpublish` → `status='draft'`, `publishedAt` сохраняется;
- проверка непустых `title` и `content` перед публикацией → 400 с локализованным сообщением.

**6.4** `site/app/api/admin/blog/tags/route.ts` (GET, POST) и `tags/[id]/route.ts` (PUT, DELETE) — по образцу `/api/admin/component-types`: slug из `slugify(firstLocale(name))`, проверка уникальности, активность, порядок, счётчик `postCount`; удаление тега чистит связи.

**6.5** `site/app/api/admin/blog/media/route.ts` — чтение каталога `site/public/uploads/blog/`, только `{ name, path }`, сортировка по имени убыв, 401 без сессии.

**6.6** `site/app/admin/(panel)/blog/page.tsx`:
- `generateMetadata`, заголовок страницы с doodle и кнопкой «Новая запись»;
- `AdminTabs`: вкладки «Записи» и «Теги» (обе серверные, как в категориях);
- записи: фильтры статуса, тега и поиска через `searchParams` (`buildUrl` как в `app/admin/(panel)/components/page.tsx`), карточки с обложкой, заголовком через `L()`, slug, датой, статус-бейджем, чипами тегов, действиями (править, опубликовать / снять с публикации, открыть на сайте, удалить через `DeleteButton`), пустое состояние;
- теги — `BlogTagsManager` по образцу `ComponentTypesManager`.

**6.7** `site/components/admin/AdminHeader.tsx`: запись Блог в `ADMIN_LINKS` **после Категорий**; `admin.header.navBlog` во всех трёх языках.

## Критерии приёмки

1. Без сессии все маршруты блога отдают 401.
2. Фильтры статуса, тега и поиск работают и переживают `router.refresh()`.
3. Переименование и удаление тега отражаются в списках и счётчиках.
4. Удаление записи убирает её связи с тегами.
5. После публикации запись появляется на `/blog`, после снятия — исчезает.
6. Пункт «Блог» в панели — между «Категории» и «Настройками», в том числе в мобильном меню.
7. `npm run check:i18n`, `check:blog`, `lint`, `build` — зелёные.

## Не делать

- Не делать редактор — это этап 7 (кнопка «Новая запись» пока может вести на заглушку).
- Не менять существующие админ-CRUD.
