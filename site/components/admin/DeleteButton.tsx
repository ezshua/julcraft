"use client";

import { useRouter } from "next/navigation";

type Props = {
  url: string;
  confirmText: string;
  icon?: string;
  /** Срез словаря для заголовка и фолбэка ошибки */
  dict: { deleteTitle: string; deleteFailed: string };
};

// Кнопка удаления с нативным confirm() и refresh после удаления (Решение 4в).
export default function DeleteButton({ url, confirmText, icon = "🗑", dict }: Props) {
  const d = dict;
  const router = useRouter();

  const del = async () => {
    if (!confirm(confirmText)) return;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      alert(text || d.deleteFailed);
    }
    router.refresh();
  };

  return (
    <button
      className="icon-btn icon-btn--rust"
      style={{ width: 32, height: 32 }}
      title={d.deleteTitle}
      onClick={() => void del()}
    >
      {icon}
    </button>
  );
}