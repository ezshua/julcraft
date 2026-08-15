import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "JulCraft",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {/* Единственный stylesheet: его подменяет skin-switcher.js (как в макете).
            suppressHydrationWarning: скин из localStorage применяется скриптом,
            поэтому href может отличаться от серверного — иначе React
            пересоздаёт дерево и сбрасывает выбранный скин */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link
          rel="stylesheet"
          href="/css/style-memphis.css"
          suppressHydrationWarning
        />
        {children}
        {/* Копия макета: скин применяется скриптом ПОСЛЕ гидратации —
            если выполнить его раньше, React увидит лишние DOM-узлы
            (панель переключателя) и упадёт на hydration mismatch */}
        <Script src="/js/skin-switcher.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
