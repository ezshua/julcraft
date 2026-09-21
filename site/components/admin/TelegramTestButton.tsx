"use client";

import { useState } from "react";
import { useAdminDict } from "./admin-dict-context";

// Кнопка «Тест: отправить сообщение» — отправляет по значениям из полей формы
// (botToken/chatId), а не из БД, чтобы тест работал до сохранения. Результат
// показывается рядом (текст, без нового дизайна).
export default function TelegramTestButton({
  botToken,
  chatId,
  dict,
}: {
  botToken: string;
  chatId: string;
  dict: { settings: { testButton: string; testSent: string; testError: string; testBusy: string } };
}) {
  const d = dict.settings;
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
        setResult(d.testSent);
      } else {
        setResult(text || d.testError);
      }
    } catch {
      setResult(d.testError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn--mustard" onClick={() => void test()} disabled={busy}>
        {d.testButton}
      </button>
      {result && (
        <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{result}</span>
      )}
    </>
  );
}
