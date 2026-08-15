import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "JulCraft",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>
        {/* Единственный stylesheet: его подменяет skin-switcher.js (как в макете) */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/css/style-memphis.css" />
        <Header />
        {children}
        <Footer />
        {/* Копия макета: применяет скин до отрисовки */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/js/skin-switcher.js"></script>
      </body>
    </html>
  );
}
