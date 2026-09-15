import type { Metadata } from "next";
import Link from "next/link";
import ErrorHeader from "@/components/layout/ErrorHeader";
import { getDictionary, getLocale, t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.notFound.title"),
    robots: { index: false },
  };
}

export default async function NotFound() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const e = dict.errors;
  return (
    <>
      {/* Копия mockup/error.html 1:1 (шапка и меню — свои, см. ErrorHeader) */}
      <ErrorHeader layout={dict.layout} />

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
            <h1 style={{ fontSize: "clamp(2rem,7vw,4rem)" }}>{e.notFoundTitle}</h1>
            <p style={{ color: "var(--cream)", fontFamily: "var(--font-mono)" }}>
              {e.notFoundText}
              <br />
              {e.notFoundSecond}
            </p>
            <div className="cta-row">
              <Link className="btn btn--primary" href="/">
                {e.homeButton}
              </Link>
              <Link className="btn btn--secondary" href="/catalog">
                {e.catalogButton}
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
            <span>{t(dict, "errors.copyright", { year: new Date().getFullYear() })}</span>
          </div>
          <div className="f-socials">
            <a href="/contacts" aria-label={e.contactsAria}>
              ✉
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
