import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSettings } from "@/lib/get-settings";
import { getDictionary, getLocale } from "@/lib/i18n";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = getSettings();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return (
    <>
      <Header settings={settings} layout={dict.layout} locale={locale} />
      {children}
      <Footer settings={settings} dict={dict} locale={locale} />
    </>
  );
}
