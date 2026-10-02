# Задание агенту — blog · 2: Markdown-подсистема

**Тип задачи:** зависимости + общий компонент рендера + стили
**Зависимости:** blog · 1
**Связанные пункты плана:** `plan-5-blog.md` §7 (markdown-подсистема), D-B4, D-B5, D-B10, D-B11, D-B12
**Файлы зоны:** `site/package.json`, `site/components/blog/MarkdownBody.tsx`, `site/lib/markdown-utils.ts`, `site/scripts/check-markdown.ts`, `site/public/css/style.css`, `site/public/css/style-memphis.css`

## Общие правила

- Новые зависимости — **только** `react-markdown` и `remark-gfm` (решение B3). Ничего больше.
- `MarkdownBody` — **без** директивы client: он должен работать и в серверном компоненте витрины, и в клиентском предпросмотре. Не оборачивать в `useMemo`/`useState`.
- Никаких `dangerouslySetInnerHTML` и санитайзеров — безопасность обеспечивает сама библиотека (сырой HTML → текст, `defaultUrlTransform` для URL).
- CSS: новые правила дописываются **в конец** обоих файлов, существующие не трогаются. Блоки копируются из `mockup/blog-post.html` и `mockup/admin/blog-editor.html`.

## Задания

**2.1** `npm install react-markdown@^10.1.0 remark-gfm@^4.0.1` — в `dependencies`. Если npm-кэш в песочнице недоступен (EPERM), попросить руководителя выполнить установку вне песочницы и продолжить с готовым `node_modules`.

**2.2** `site/components/blog/MarkdownBody.tsx`:
- `import Markdown from "react-markdown"` и `import remarkGfm from "remark-gfm"`;
- `remarkPlugins={[remarkGfm]}`;
- `components.img` → `<img loading="lazy" decoding="async" className="prose-img">`; в шапке файла — отключение `@next/next/no-img-element` с пояснением (D-B10);
- `components.a` → при внешнем URL добавляет `target="_blank" rel="noopener noreferrer"` (D-B12);
- обёртка `<div className="prose">`;
- проп `source: string`.

**2.3** `site/lib/markdown-utils.ts`:
- `stripMarkdown(src): string` — чистый текст: убрать разметку инлайнов и блоков, схлопнуть пробелы;
- `extractImagePaths(src): string[]` — уникальные пути `/uploads/...` из markdown-ссылок и «голых» URL;
- без `server-only` и без директивы client — модуль используется и скриптами, и страницей.

**2.4** `site/scripts/check-markdown.ts` + npm-скрипт `check:markdown`:
- `stripMarkdown` на размеченном тексте (заголовки, списки, таблица, картинка, ссылка);
- `extractImagePaths` на трёх форматах (markdown-картинка, html-подобный текст, повторы);
- smoke-тест `MarkdownBody` через `react-dom/server` + `renderToStaticMarkup`: тег `script` не появился в HTML; ссылка с `javascript:` получила пустой `href`; GFM-таблица дала `<table>`; зачёркивание дало `<del>`; картинка получила `loading="lazy"`.

**2.5** Стили `.prose` в `site/public/css/style.css` и `site/public/css/style-memphis.css` — копией из `mockup/blog-post.html`: заголовки, абзацы, списки (включая task-list), цитаты, код и преформатированный блок, таблицы, картинки, ссылки, разделитель. В обоих скинах одинаково.

## Критерии приёмки

1. `npm run check:markdown` зелёный.
2. `MarkdownBody` импортируется и в серверном, и в клиентском компоненте без ошибок сборки.
3. Рендер совпадает с макетом в обоих скинах.
4. XSS-кейсы закрыты на уровне библиотеки (проверено smoke-тестом).
5. `npm run lint`, `npm run build` зелёные.

## Не делать

- Не подключать `remark-breaks` (D-B11) и любые другие плагины.
- Не подключать `rehype-raw` — это вернуло бы сырой HTML.
- Не добавлять рендеринг на клиенте для витрины — только серверный компонент.
