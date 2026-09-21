"use client";

import Link from "next/link";
import { useAdminDict } from "@/components/admin/admin-dict-context";
// Ошибка админки — тот же стиль mockup/error.html; кнопки: reset() и «В панель».
export default function AdminError({ reset }: { reset: () => void }) {
  const d = useAdminDict().panel;

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
        <h1 style={{ fontSize: "clamp(1.6rem,5vw,3rem)" }}>{d.errorTitle}</h1>
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          {d.errorText}
        </p>
        <div className="cta-row">
          <button className="btn btn--primary" onClick={reset}>
            {d.refresh}
          </button>
          <Link className="btn btn--secondary" href="/admin">
            {d.toPanel}
          </Link>
        </div>
      </div>
    </div>
  );
}