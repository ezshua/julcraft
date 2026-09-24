import type { Metadata } from "next";
import Script from "next/script";
import { siteUrl } from "@/lib/site-url";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import { getServerSkin } from "@/lib/skin-server";

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
  const skin = await getServerSkin();
  return (
    <html lang={locale}>
      <body>
        <link
          rel="stylesheet"
          href={skin === "handmade" ? "/css/style.css" : "/css/style-memphis.css"}
          data-default-skin={skin}
        />
        {children}
        <Script src="/js/skin-switcher.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
