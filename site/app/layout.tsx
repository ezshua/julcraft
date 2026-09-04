import type { Metadata } from "next";
import Script from "next/script";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "JulCraft",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {/* preconnect к Google Fonts: @import в скинах тянет шрифты
            с fonts.gstatic.com (внешний по решению руководителя —
            шрифты зашиты в CSS макета, скины не правим) — раннее
            рукопожатие убирает DNS/TCP/TLS из критического пути */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
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
