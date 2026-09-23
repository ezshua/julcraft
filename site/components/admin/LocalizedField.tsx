"use client";

import { useState } from "react";
import { useAdminLocale } from "./admin-dict-context";

export type LocalizedValue = { ru: string; en: string; uk: string };

type Props = {
  value: LocalizedValue;
  onChange: (next: LocalizedValue) => void;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  /** Встроенный режим без обёртки .field (для ячеек таблиц) */
  compact?: boolean;
};

const TABS = ["RU", "EN", "UK"] as const;

// Начальная вкладка по локали админки (RU=0, EN=1, UK=2).
function tabForLocale(locale: string | null): number {
  if (locale === "en") return 1;
  if (locale === "uk") return 2;
  return 0;
}

// Текстовое поле с тремя вкладками RU/EN/UK (i18n-2 · Шаг 7).
// RU — основной инпут (обязателен), EN/UK — дополнительные. UI админки остаётся на русском.
// Начальная вкладка синхронизируется с языком админки: если мастер переключил
// админку на EN/UK, поля ввода открываютcя на соответствующей вкладке.
export default function LocalizedField({
  value,
  onChange,
  label,
  multiline,
  placeholder,
  compact,
}: Props) {
  const adminLocale = useAdminLocale();
  const [tab, setTab] = useState(tabForLocale(adminLocale));
  const current = TABS[tab];
  const Input = multiline ? "textarea" : "input";
  const field = (
    <>
      <div className="loc-tabs">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            className={tab === i ? "loc-tab is-active" : "loc-tab"}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <label>
        {label}
        {/* <span className="loc-tab-label">{current}</span> */}
        <Input
          type="text"
          placeholder={placeholder}
          value={value[current.toLowerCase() as keyof LocalizedValue]}
          onChange={(e) =>
            onChange({ ...value, [current.toLowerCase() as keyof LocalizedValue]: e.target.value })
          }
          style={{ resize: multiline ? "vertical" : undefined }}
        />
      </label>
    </>
  );
  if (compact) return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{field}</div>;
  return <div className="field">{field}</div>;
}