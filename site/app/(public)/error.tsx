"use client";

import Link from "next/link";

// Ошибка публичной части — стиль mockup/error.html (сломанная брошь на вывеске).
// «На главную» — навигация, «Попробовать снова» — reset() сегмента.
export default function PublicError({ reset }: { reset: () => void }) {
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
          <h1 style={{ fontSize: "clamp(2rem,7vw,4rem)" }}>Что-то сломалось</h1>
          <p style={{ color: "var(--cream)", fontFamily: "var(--font-mono)" }}>
            Брошь выскользнула из рук — страница не смогла открыться.
            <br />
            Попробуйте ещё раз или вернитесь на витрину.
          </p>
          <div className="cta-row">
            <Link className="btn btn--primary" href="/">
              На главную
            </Link>
            <button className="btn btn--secondary" onClick={reset}>
              Попробовать снова
            </button>
          </div>
        </div>
        <div className="zigzag"></div>
      </div>
    </main>
  );
}
