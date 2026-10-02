# Задание агенту — blog · 5: Страница записи

**Тип задачи:** публичная страница + SEO
**Зависимости:** blog · 2, blog · 4
**Связанные пункты плана:** `plan-5-blog.md` §2, §6, §9; D-B3, D-B4, D-B6; решение B2
**Файлы зоны:** `site/app/(public)/blog/[slug]/page.tsx`

## Общие правила

- Вёрстка 1:1 из `mockup/blog-post.html`.
- Данные — только через `getPublishedPostBySlug()` и `getAdjacentPosts()` из `lib/blog.ts`.
- SEO-поля — по образцу `app/(public)/product/[slug]/page.tsx`.

## Задания

**5.1** `site/app/(public)/blog/[slug]/page.tsx`:
- `getPublishedPostBySlug(slug)`; запись не найдена → `notFound()`;
- крошки Главная → Блог → Заголовок;
- `article`: заголовок, `time` с ISO-датой в формате локали, строка тегов (ссылки на `/blog?tag=<slug>`), обложка `next/image` (`sizes` как у `about/page.tsx`, `alt` = заголовок), `<MarkdownBody source={L(content, locale)} />`;
- ссылка «← все записи», соседние записи из `getAdjacentPosts()`, зигзаг.

**5.2** `generateMetadata`:
- `metaTitle` / `metaDescription` через `L()` с фолбэком (по образцу `autoTitle` / `autoDescription` у товара):
- `alternates.canonical = /blog/<slug>`;
- OG: заголовок, описание, `images` = `coverImage`.

**5.3** Без обложки страница рендерится без неё — падений нет.

**5.4** Проверка длинной записи (таблица, много картинок) в обоих скинах против макета.

## Критерии приёмки

1. Опубликованная запись открывается по slug; черновик и запись с пустым `publishedAt` — 404.
2. Запись без обложки открывается.
3. RU/EN/UK с фолбэком RU; markdown отрисован через `MarkdownBody`.
4. Теги ведут на отфильтрованный список; соседние записи ведут на соседние по дате.
5. OG-теги корректны.
6. `npm run lint`, `npm run build` зелёные.

## Не делать

- Не добавлять комментарии, просмотры, RSS.
- Не делать редиректы со старого slug — отдельное решение, если понадобится.
