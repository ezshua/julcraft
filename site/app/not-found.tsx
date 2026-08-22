import type { Metadata } from "next";
import Link from "next/link";
import ErrorHeader from "@/components/layout/ErrorHeader";

export const metadata: Metadata = {
  title: "Страница не найдена — JulCraft",
};

export default function NotFound() {
  return (
    <>
      {/* Копия mockup/error.html 1:1 (шапка и меню — свои, см. ErrorHeader) */}
      <ErrorHeader />

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
            <h1 style={{ fontSize: "clamp(2rem,7vw,4rem)" }}>Ой, 404</h1>
            <p style={{ color: "var(--cream)", fontFamily: "var(--font-mono)" }}>
              Такой страницы нет — брошь здесь не висела.
              <br />
              Проверьте, не потерялась ли она в каталоге.
            </p>
            <div className="cta-row">
              <Link className="btn btn--primary" href="/">
                На главную
              </Link>
              <Link className="btn btn--secondary" href="/catalog">
                Смотреть каталог
              </Link>
            </div>
          </div>
          <div className="zigzag"></div>
        </div>
      </main>

      <footer className="footer">
        <div className="f-grid">
          <div className="f-brand">
            <b>JulCraft</b>
            <span>ул. Мстислава Скрипника, 40А — на пятачке</span>
          </div>
          <div className="f-copy">
            <span>© 2026 JulCraft · с 2002 года (почти)</span>
          </div>
          <div className="f-socials">
            <a href="/contacts" aria-label="Контакты">
              ✉
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
