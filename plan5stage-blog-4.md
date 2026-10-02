# Задание агенту — blog · 4: Витрина блога

**Тип задачи:** публичные страницы + словари + SEO
**Зависимости:** blog · 1, blog · 2
**Связанные пункты плана:** `plan-5-blog.md` §2 (критерии), §5, §6, §9; D-B2, D-B3, D-B6, D-B13; решения B2, B7
**Файлы зоны:** `site/app/(public)/blog/page.tsx`, `site/components/blog/{PostCard,PostGroup,DateNav,TagFilter,BlogEmpty}.tsx`, `site/components/layout/nav-links.ts`, `site/lib/dictionaries/{ru,en,uk}.ts`, `site/app/sitemap.ts`, `site/app/robots.ts`

## Общие правила

- Перенос вёрстки **1:1** из `mockup/blog.html` — структура и классы те же.
- Публичные выборки — **только** через `lib/blog.ts`; прямых `db.select()` по `blogPosts` на витрине нет.
- Ключи словарей добавляются сразу в `ru.ts`, `en.ts`, `uk.ts`; `npm run check:i18n` зелёный.
- Next 16: `searchParams` и `params` — асинхронные (`Promise`), как в существующих страницах.
- 0 кириллицы в коде вне комментариев.

## Задания

**4.1** `site/components/blog/*` — компоненты по макету:
- `PostCard.tsx` — обложка (`next/image` с `sizes`, плейсхолдер если нет), заголовок, кратко, дата;
- `PostGroup.tsx` — заголовок группы «сентябрь 2026» и карточки;
- `DateNav.tsx` — годы и месяцы выбранного года ссылками (`?y=&m=`);
- `TagFilter.tsx` — чипы активных тегов со счётчиками + «все записи»;
- `BlogEmpty.tsx` — пустое состояние в стиле `components/ui/EmptyState.tsx`, но со своим текстом.

**4.2** `site/app/(public)/blog/page.tsx`:
- `generateMetadata` из `meta.blog.*`;
- крошки, вывеска, зигзаги — по макету;
- фильтр тегов, навигация по датам, группы, пагинация `.page-btn` (`buildUrl`/`pageUrl` как в `app/(public)/catalog/[slug]/page.tsx`);
- `searchParams` (`y`, `m`, `tag`, `page`): неверные значения игнорируются; `m` без `y` — все месяцы года; неизвестный тег — пустое состояние, не 500.

**4.3** Меню (B7):
- `site/components/layout/nav-links.ts` — запись `{ href: "/blog", key: "blog" }` между `configurator` и `about`;
- словари: `layout.nav.blog` и `layout.errorNav.blog` во всех трёх языках;
- мобильное меню обновляется автоматически (тот же массив).

**4.4** Словари (все три языка): `meta.blog.title`, `description`, `descriptionOg`; публичный блок `blog.*` — crumbs, est, tagline, secSub, found, months[12], empty*, backToAll, filterTags, allTags, readMore.

**4.5** `site/app/sitemap.ts`: `/blog` плюс опубликованные записи из `getPublishedPosts()` (`lastModified = updatedAt`, `monthly`, `priority 0.6`). Черновиков в карте нет по построению.

**4.6** `site/app/robots.ts`: без изменений; убедиться, что `/blog` публичен.

## Критерии приёмки

1. Список с 0, 1, 9 и 10 записями: корректная пагинация; с 9 записями кнопок «далее» нет.
2. Записи разных месяцев: группировка и навигация работают; `?y=2026` без `m` — все месяцы года.
3. Фильтр по тегу сужает список; несуществующий тег — пустое состояние, не ошибка.
4. Черновик не виден нигде на витрине и не попадает в `sitemap.xml`.
5. Пункт «Блог» стоит между «Конфигуратор» и «О нас» в десктопном и мобильном меню.
6. RU/EN/UK; без перевода — фолбэк RU, пустых заголовков нет.
7. `npm run check:i18n`, `check:blog`, `lint`, `build` — зелёные.

## Не делать

- Не делать страницу записи — это этап 5.
- Не трогать главную страницу (B8) и CSS-скины (стили приходят на этапе 2 по `.prose`, здесь — только блоки из макета).
