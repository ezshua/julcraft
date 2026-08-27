import type { Metadata } from "next";
import Image from "next/image";
import { getSettings } from "@/lib/get-settings";
import { telHref } from "@/lib/settings";
import HoursBoard from "@/components/ui/HoursBoard";

export const metadata: Metadata = {
  title: "О мастерской — JulCraft",
  description:
    "История мастерской JulCraft: Юля, много лет за рукоделием. Ручная работа, ремонт старины и чай покупателям.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "О мастерской — JulCraft",
    description:
      "История мастерской JulCraft: ручная работа, ремонт старины и чай покупателям.",
    type: "website",
  },
};

export default function AboutPage() {
  const settings = getSettings();

  return (
    <>
      <div className="signboard">
        <p className="est">✹ о мастерской ✹</p>
        <h1>История на верстаке</h1>
        <p className="tagline">Юля-Юличка · много лет за рукоделием · от идеи "до" переходим к изделию "после"</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="hours-grid" style={{ alignItems: "start" }}>
          <div>
            <h2 className="sec-h2">Мастерская, где вещи помнят руки</h2>
            <p className="sec-sub">{"// чек знакомства — полная версия, читается до конца"}</p>
            <p className="muted mb-10">
              Юля начинала с ремонта бабушкиных бус в 2014-м — теперь на полках три
              витрины, четыре ящика бакелита и один очень важный ящик «на потом». Всё
              делается вручную: пайка, чеканка, вплетение, эмаль. Никаких станков, если
              не считать верстак деда.
            </p>
            <p className="muted mb-10">
              Половине украшений на витрине мы дарим вторую жизнь: приносите одинокие
              серьги и клипсы без пары — сядем, посмотрим, придумаем.
            </p>
            <p className="muted">К каждой вещи прилагается история, к каждому заказу — чай. Бесплатно.</p>
          </div>
          <div className="hours-grid" style={{ display: "block" }}>
            <div className="item" style={{ overflow: "hidden" }}>
              <div className="photo" style={{ height: "280px", position: "relative" }}>
                <Image
                  src="/uploads/about-workshop.jpg"
                  alt="Мастерская Юли"
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
          <h2>◍ ЧЕК ЗНАКОМСТВА · ПОЛНЫЙ ◍</h2>
          {settings.about.history.rows.map((row, i) => (
            <div className="row" key={i}>
              <span>{row.label}</span>
              <span className="r">{row.value}</span>
            </div>
          ))}
          <p className="thanks">{settings.about.history.thanks}</p>
          <div className="barcode"></div>
        </div>
      </div>

      {/* Ценности */}
      <section className="sect">
        <h2 className="sec-h2">На чём стоит мастерская</h2>
        <p className="sec-sub">
          {"// четыре правила, на железной коробке из-под печенья — и в жизни железно"}
        </p>
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
                <h3>{p.title}</h3>
                <p className="desc">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Контакты-тизер */}
      <section className="sect">
        <div className="hours-grid">
          <div className="hours-txt">
            <h2 className="sec-h2">Зайти в гости</h2>
            <p className="sec-sub">{"// "}{settings.contacts.address} · Солома</p>
            <p>
              Мастерская между «бизнесменами» и почтовыми ящиками. Узнаете по
              жёлтой вывеске и запаху тепла.
            </p>
            <p>
              Лучше позвонить перед визитом — Юля может быть в кладовке, где телефон не
              ловит.
            </p>
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
