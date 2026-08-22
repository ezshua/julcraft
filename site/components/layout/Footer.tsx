import Link from "next/link";
import { telHref, type SiteSettings } from "@/lib/settings";

export default function Footer({ settings }: { settings: SiteSettings }) {
  const { contacts } = settings;
  // Подписи дней — статичная копия макета; значения — из Settings по индексу
  const footerDayLabels = ["Понедельник", "Вт — Пт", "Суббота", "Воскресенье"];
  return (
    <footer className="footer">
      <div className="f-grid">
        <div>
          <div className="f-brand">
            JulCraft
            <span>
              {contacts.address} · мастерская украшений · эст. 2002 (почти)
            </span>
          </div>
        </div>
        <div>
          <h4>Часы работы</h4>
          {footerDayLabels.map((label, i) => (
            <div className="day" key={label}>
              <span>{label}</span>
              {contacts.hours[i]?.closed ? (
                <span className="closed">{contacts.hours[i].value}</span>
              ) : (
                <span>{contacts.hours[i]?.value ?? ""}</span>
              )}
            </div>
          ))}
        </div>
        <div className="f-links">
          <h4>Связаться</h4>
          <a href={telHref(contacts.phone)}>☎ {contacts.phone}</a>
          <a href={`mailto:${contacts.email}`}>✉ {contacts.email}</a>
          <Link href="/contacts">⛭ {contacts.address}</Link>
          <div className="f-socials">
            <a href="#" aria-label="Instagram" title="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22242a" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r=".5" fill="#22242a" />
              </svg>
            </a>
            <a href="#" aria-label="Telegram" title="Telegram">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22242a" strokeWidth="2" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="f-copy">JulCraft · с 2002 года (почти) · © 2026</div>
    </footer>
  );
}
