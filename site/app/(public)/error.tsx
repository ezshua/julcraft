"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ru } from "@/lib/dictionaries/ru";
import { en } from "@/lib/dictionaries/en";
import { uk } from "@/lib/dictionaries/uk";

// Ошибка публичной части — стиль mockup/error.html (сломанная брошь на вывеске).
// «На главную» — навигация, «Попробовать снова» — reset() сегмента.
// Граница ошибки не получает пропсов от сервера, поэтому locale читается
// из cookie (как в skin-switcher.js); при SSR-рендере границы — RU-снимок.
function noSubscribe() {
  return () => {};
}

function clientSnapshot() {
  const match = document.cookie.match(/(?:^|;\s*)julcraft-locale=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : "";
  if (value === "en") return en.errors;
  if (value === "uk") return uk.errors;
  return ru.errors;
}

export default function PublicError({ reset }: { reset: () => void }) {
  const e = useSyncExternalStore(
    noSubscribe,
    clientSnapshot,
    () => ru.errors,
  );
  return (
    <main>
      <div className="signboard" style={{ paddingBottom: "70px" }}>
        <div className="zigzag"></div>
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
          <h1 style={{ fontSize: "clamp(2rem,7vw,4rem)" }}>{e.errorTitle}</h1>
          <p style={{ color: "var(--cream)", fontFamily: "var(--font-mono)" }}>
            {e.errorText}
            <br />
            {e.errorSecond}
          </p>
          <div className="cta-row">
            <Link className="btn btn--primary" href="/">
              {e.homeButton}
            </Link>
            <button className="btn btn--secondary" onClick={reset}>
              {e.errorRetry}
            </button>
          </div>
        </div>
        <div className="zigzag"></div>
      </div>
    </main>
  );
}
