/* eslint-disable @next/next/no-img-element */
// Рендер текста записи блога из Markdown (plan-5-blog.md §7).
//
// Один и тот же компонент работает и в серверном компоненте витрины, и в
// клиентском предпросмотре редактора (D-B4): react-markdown синхронный и
// без хуков, поэтому директива "use client" здесь не нужна, а useMemo и
// useState — тем более.
//
// Правило eslint про <img> отключено по D-B10: в Markdown у картинки нет
// размеров, next/image без width/height требует fill-обёртки и ломает поток
// абзаца. Размеры задаёт CSS .prose img из макета.

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Внешний адрес: и http(s)://, и протокол-относительный //example.com.
// Внутренние ссылки витрины (/blog/<slug>) открываем в той же вкладке.
const EXTERNAL = /^(https?:)?\/\//i;

const components: Components = {
  // D-B10: обычный img с ленивой загрузкой, а не next/image.
  img({ src, alt, title }) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        title={title}
        loading="lazy"
        decoding="async"
        className="prose-img"
      />
    );
  },
  // D-B12: внешние ссылки открываются в новой вкладке.
  a({ href, children }) {
    const external = typeof href === "string" && EXTERNAL.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
};

export default function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="prose">
      {/* remark-gfm даёт таблицы, зачёркивание, списки задач и автоссылки.
          Одиночный перенос строки <br> не даёт — remark-breaks не подключаем
          (D-B11). rehype-raw не подключаем: сырой HTML и так не рендерится
          (D-B5), а с ним вернулась бы и возможность вставки разметки. */}
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
