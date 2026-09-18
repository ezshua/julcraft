import type { Metadata } from "next";
import Image from "next/image";
import { getSettings } from "@/lib/get-settings";
import { telHref } from "@/lib/settings";
import { L } from "@/lib/localize";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import HoursBoard from "@/components/ui/HoursBoard";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.about.title"),
    description: t(dict, "meta.about.description"),
    alternates: { canonical: "/about" },
    openGraph: {
      title: t(dict, "meta.about.title"),
      description: t(dict, "meta.about.descriptionOg"),
      type: "website",
    },
  };
}

export default async function AboutPage() {
  const settings = getSettings();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const a = dict.about;
  const address = L(settings.contacts.address, locale);

  return (
    <>
      <div className="signboard">
        <p className="est">{a.est}</p>
        <h1>{a.title}</h1>
        <p className="tagline">{a.tagline}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="hours-grid" style={{ alignItems: "start" }}>
          <div>
            <h2 className="sec-h2">{a.storyTitle}</h2>
            <p className="sec-sub">{a.storySub}</p>
            <p className="muted mb-10">{a.storyP1}</p>
            <p className="muted mb-10">{a.storyP2}</p>
            <p className="muted">{a.storyP3}</p>
          </div>
          <div className="hours-grid" style={{ display: "block" }}>
            <div className="item" style={{ overflow: "hidden" }}>
              <div className="photo" style={{ height: "280px", position: "relative" }}>
                <Image
                  src="/uploads/about-workshop.jpg"
                  alt={a.photoAlt}
                  fill
                  sizes="(max-width: 1079px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Чек знакомства (полный) */}
      <div className="receipt-sec">
        <div className="receipt receipt--wide">
          <h2>{a.receiptTitle}</h2>
          {settings.about.history.rows.map((row, i) => (
            <div className="row" key={i}>
              <span>{L(row.label, locale)}</span>
              <span className="r">{L(row.value, locale)}</span>
            </div>
          ))}
          <p className="thanks">{L(settings.about.history.thanks, locale)}</p>
          <div className="barcode"></div>
        </div>
      </div>

      {/* Ценности */}
      <section className="sect">
        <h2 className="sec-h2">{a.principlesTitle}</h2>
        <p className="sec-sub">{a.principlesSub}</p>
        <div className="shelf">
          {settings.about.principles.map((p, i) => (
            <div className="item item--cat" key={i}>
              <div className="cat-icon">
                {i === 0 && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22242a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                {i === 1 && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22242a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                )}
                {i === 2 && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22242a" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 3v18M3 12h18" />
                  </svg>
                )}
                {i === 3 && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22242a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 21h8M12 17v4M7 4h10l1 4a5 5 0 0 1-12 0z" />
                  </svg>
                )}
              </div>
              <div className="info">
                <h3>{L(p.title, locale)}</h3>
                <p className="desc">{L(p.text, locale)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Контакты-тизер */}
      <section className="sect">
        <div className="hours-grid">
          <div className="hours-txt">
            <h2 className="sec-h2">{a.visitTitle}</h2>
            <p className="sec-sub">
              {t(dict, "about.visitSub", { address })}
            </p>
            <p>{a.visitP1}</p>
            <p>{a.visitP2}</p>
            <a className="phone" href={telHref(settings.contacts.phone)}>
              ☎ {settings.contacts.phone}
            </a>
          </div>
          <HoursBoard hours={settings.contacts.hours} />
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
