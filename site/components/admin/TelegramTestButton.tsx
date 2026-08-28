"use client";

import { useState } from "react";

// Кнопка «Тест: отправить сообщение» — отправляет по значениям из полей формы
// (botToken/chatId), а не из БД, чтобы тест работал до сохранения. Результат
// показывается рядом (текст, без нового дизайна).
export default function TelegramTestButton({
  botToken,
  chatId,
}: {
  botToken: string;
  chatId: string;
}) {
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const test = async () => {
    if (busy) return;
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/settings/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, chatId }),
      });
      const text = await res.text();
      if (res.ok) {
        setResult("Отправлено ✓");
      } else {
        setResult(text || "Ошибка отправки");
      }
    } catch {
      setResult("Ошибка отправки");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn--mustard" onClick={() => void test()} disabled={busy}>
        Тест: отправить сообщение
      </button>
      {result && (
        <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{result}</span>
      )}
    </>
  );
}
