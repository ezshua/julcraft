import type { Metadata } from "next";
import Script from "next/script";
import { siteUrl } from "@/lib/site-url";
import { getDictionary, getLocale, t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: t(dict, "meta.siteName"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
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
