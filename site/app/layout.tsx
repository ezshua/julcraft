import type { Metadata } from "next";
import Script from "next/script";
import { siteUrl } from "@/lib/site-url";
import { getDictionary, getLocale, t } from "@/lib/i18n";

// Стартовый скин для клиентов без сохранённого выбора (i18n-3, D-i18n-6):
// cookie клиента (localStorage) приоритетнее; без него — DEFAULT_SKIN из .env.
const DEFAULT_SKIN = process.env.DEFAULT_SKIN === "handmade" ? "handmade" : "memphis";

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
            пересоздаёт дерево и сбрасывает выбранный скин.
            Стартовый href — из DEFAULT_SKIN (env); при отсутствии localStorage
            client остаётся на этом скине (cookie/localStorage приоритетнее). */}
        <link
          rel="stylesheet"
          href={DEFAULT_SKIN === "handmade" ? "/css/style.css" : "/css/style-memphis.css"}
          data-default-skin={DEFAULT_SKIN}
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
