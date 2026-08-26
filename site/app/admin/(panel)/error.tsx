"use client";

import Link from "next/link";
// Ошибка админки — тот же стиль mockup/error.html; кнопки: reset() и «В панель».
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div className="error-sign">
        <svg
          viewBox="0 0 24 24"
          width="72"
          height="72"
          fill="none"
          stroke="var(--mustard)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l7 7-7 13L5 9z" />
          <path d="M12 9v4" stroke="var(--rust)" />
          <circle cx="12" cy="15.5" r=".5" fill="var(--rust)" stroke="none" />
        </svg>
        <h1 style={{ fontSize: "clamp(1.6rem,5vw,3rem)" }}>Что-то сломалось</h1>
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          Панель не смогла открыть раздел. Попробуйте ещё раз.
        </p>
        <div className="cta-row">
          <button className="btn btn--primary" onClick={reset}>
            Обновить
          </button>
          <Link className="btn btn--secondary" href="/admin">
            В панель
          </Link>
        </div>
      </div>
    </div>
  );
}
