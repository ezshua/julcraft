"use client";

import { useRouter } from "next/navigation";

type Props = {
  url: string;
  confirmText: string;
};

// Кнопка «🗑» с нативным confirm() и refresh после удаления (Решение 4в).
export default function DeleteButton({ url, confirmText }: Props) {
  const router = useRouter();

  const del = async () => {
    if (!confirm(confirmText)) return;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      alert(text || "Не получилось удалить");
    }
    router.refresh();
  };

  return (
    <button
      className="icon-btn icon-btn--rust"
      style={{ width: 32, height: 32 }}
      title="Удалить"
      onClick={() => void del()}
    >
      🗑
    </button>
  );
}