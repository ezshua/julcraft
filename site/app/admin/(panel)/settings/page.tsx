import type { Metadata } from "next";
import { getSettings } from "@/lib/get-settings";
import SettingsPanel from "@/components/admin/SettingsPanel";

export const metadata: Metadata = {
  title: "Настройки — JulCraft Админ",
};

export default function AdminSettingsPage() {
  const settings = getSettings();

  return (
    <>
      <div className="page-title">
        <h1>Настройки</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">контакты · тексты · telegram</span>
        </div>
      </div>

      <SettingsPanel settings={settings} />
    </>
  );
}