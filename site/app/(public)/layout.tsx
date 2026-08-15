import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSettings } from "@/lib/get-settings";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  return (
    <>
      <Header settings={settings} />
      {children}
      <Footer settings={settings} />
    </>
  );
}
