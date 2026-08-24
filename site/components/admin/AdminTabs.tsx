"use client";

import { useState, type ReactNode } from "react";

type Props = {
  firstLabel: string;
  secondLabel: string;
  /** Содержимое первой вкладки (рендерится сервером всегда — состояние не теряется). */
  first: ReactNode;
  /** Содержимое второй вкладки. */
  second: ReactNode;
};

// Переключатель вкладок страницы «Категории» (план componentsExt).
// Обе вкладки приходят с сервера и остаются в DOM: скрытие через display,
// поэтому router.refresh() обновляет обе и ничего не сбрасывает.
export default function AdminTabs({
  firstLabel,
  secondLabel,
  first,
  second,
}: Props) {
  const [tab, setTab] = useState<"first" | "second">("first");

  return (
    <>
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
        <button
          className={tab === "first" ? "btn btn--primary" : "btn"}
          onClick={() => setTab("first")}
        >
          {firstLabel}
        </button>
        <button
          className={tab === "second" ? "btn btn--primary" : "btn"}
          onClick={() => setTab("second")}
        >
          {secondLabel}
        </button>
      </div>
      <div style={{ display: tab === "first" ? undefined : "none" }}>{first}</div>
      <div style={{ display: tab === "second" ? undefined : "none" }}>{second}</div>
    </>
  );
}
