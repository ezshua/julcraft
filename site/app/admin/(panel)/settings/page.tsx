import type { Metadata } from "next";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminDictProvider } from "@/components/admin/admin-dict-context";
import SettingsPanel from "@/components/admin/SettingsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: dict.admin.settings.title };
}

export default async function AdminSettingsPage() {
  const dict = getDictionary(await getLocale());
  const settings = getSettings();
  const currency = await getDisplayCurrency();

  return (
    <AdminDictProvider dict={dict.admin}>
      <>
        <div className="page-title">
          <h1>{dict.admin.settings.heading}</h1>
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <span className="doodle">{dict.admin.settings.doodle}</span>
          </div>
        </div>

        <SettingsPanel settings={settings} currencyCode={currency.code} dict={dict.admin} />
      </>
    </AdminDictProvider>
  );
}