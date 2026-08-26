import type { Metadata } from "next";
import { getSettings } from "@/lib/get-settings";
import { telHref } from "@/lib/settings";
import Crumbs from "@/components/ui/Crumbs";
import ContactForm from "@/components/contacts/ContactForm";
import HoursBoard from "@/components/ui/HoursBoard";

export const metadata: Metadata = {
  title: "Контакты — JulCraft",
  description:
    "Контакты мастерской JulCraft: телефон, email, адрес, часы работы. Позвоните, напишите или зайдите на чай.",
  alternates: { canonical: "/contacts" },
  openGraph: {
    title: "Контакты — JulCraft",
    description:
      "Контакты мастерской JulCraft: телефон, email, адрес, часы работы.",
    type: "website",
  },
};

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "8px 0",
  borderBottom: "1px dashed var(--dot)",
  fontSize: ".84rem",
};

export default function ContactsPage() {
  const settings = getSettings();
  const { contacts } = settings;

  return (
    <>
      <Crumbs items={[{ label: "Главная", href: "/" }, { label: "Контакты" }]} />

      <div className="signboard signboard--small">
        <p className="est">✹ всегда рады ✹</p>
        <h1>Контакты</h1>
        <p className="tagline">
          позвоните, напишите или зайдите на чай — отвечаем быстрее, чем остывает чайник
        </p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="hours-grid" style={{ alignItems: "start" }}>
          {/* Левая колонка: форма в стиле чека */}
          <ContactForm />

          {/* Правая колонка: карта + контакты */}
          <div>
            <div className="item" style={{ overflow: "hidden", marginBottom: "22px" }}>
              {/* Решение №6 (Этап 6): Google Maps embed по адресу из Settings, без API-ключа */}
              <iframe
                title={`Карта — ${contacts.address}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(contacts.address)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                style={{
                  width: "100%",
                  height: "260px",
                  border: "none",
                  display: "block",
                  background: "var(--paper)",
                }}
              />
              <span
                style={{
                  display: "block",
                  padding: "8px 12px 10px",
                  fontSize: ".7rem",
                  color: "var(--muted)",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Google Maps · {contacts.address}
              </span>
            </div>

            <div className="board board--paper">
              <div className="b-head">
                <h3>Связаться напрямую</h3>
              </div>
              <div className="b-body">
                <div className="receipt-row" style={ROW_STYLE}>
                  <span>ТЕЛЕФОН</span>
                  <span>
                    <a href={telHref(contacts.phone)}>{contacts.phone}</a>
                  </span>
                </div>
                <div className="receipt-row" style={ROW_STYLE}>
                  <span>EMAIL</span>
                  <span>
                    <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
                  </span>
                </div>
                <div className="receipt-row" style={ROW_STYLE}>
                  <span>АДРЕС</span>
                  <span>{contacts.address}</span>
                </div>
                <div className="receipt-row" style={ROW_STYLE}>
                  <span>СОЦСЕТИ</span>
                  <span style={{ display: "flex", gap: "8px" }}>
                    <a href={contacts.instagram} aria-label="Instagram">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22242a" strokeWidth="2" strokeLinecap="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r=".5" fill="#22242a" />
                      </svg>
                    </a>
                    <a href={contacts.telegram} aria-label="Telegram">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22242a" strokeWidth="2" strokeLinejoin="round">
                        <path d="m22 2-7 20-4-9-9-4z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    </a>
                  </span>
                </div>
                <HoursBoard hours={contacts.hours} className="mt-20" style={{ boxShadow: "none" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
