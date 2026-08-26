"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHANNELS = [
  { value: "phone", label: "Телефон" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
];

const CONTACT_HINTS: Record<string, string> = {
  phone: "+380 95 123 45 67",
  telegram: "@username",
  email: "you@example.com",
};

function contactError(contact: string, channel: string): string {
  const v = contact.trim();
  if (channel === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
      ? ""
      : "Похоже, это не email — нужен адрес вида you@example.com";
  }
  if (channel === "telegram") {
    return /^@?[a-zA-Z0-9_]{5,32}$/.test(v.replace(/^https?:\/\/t\.me\//i, ""))
      ? ""
      : "Похоже, это не Telegram — нужен @username или ссылка на t.me";
  }
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15
    ? ""
    : "Похоже, это не телефон — нужно от 10 до 15 цифр, можно с + и пробелами";
}

// Форма обратной связи — копия чека из mockup/contacts.html.
// Успех → редирект на /order-success/{id} (R-3, чек type=contact).
export default function ContactForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const contactErr = contact.trim() ? contactError(contact, channel) : "";

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) {
      setError("Укажите имя");
      return;
    }
    if (!contact.trim()) {
      setError("Укажите контакт");
      return;
    }
    if (!message.trim()) {
      setError("Напишите сообщение");
      return;
    }
    const cErr = contactError(contact, channel);
    if (cErr) {
      setError(cErr);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message, channel }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Не получилось отправить — попробуйте ещё раз");
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { id: number };
      router.push(`/order-success/${data.id}`);
    } catch {
      setError("Не получилось отправить — попробуйте ещё раз");
      setBusy(false);
    }
  };

  return (
    <div className="receipt receipt--form" style={{ maxWidth: "100%", margin: 0 }}>
      <h2>◍ ФОРМА ОБРАТНОЙ СВЯЗИ ◍</h2>
      <div className="row">
        <span className="lbl">Ваше имя</span>
      </div>
      <div className="field">
        <input
          type="text"
          placeholder="Как к вам обращаться"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="row">
        <span className="lbl">Контакт</span>
      </div>
      <div className="field">
        <input
          type="text"
          placeholder={CONTACT_HINTS[channel]}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
        {contactErr && (
          <p style={{ color: "var(--rust)", fontSize: ".78rem", margin: "4px 0 0" }}>
            {contactErr}
          </p>
        )}
      </div>
      <div className="row">
        <span className="lbl">Сообщение</span>
      </div>
      <div className="field">
        <textarea
          placeholder="Вопрос, заказ, ремонт бабушкиных бус — что угодно"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <div className="row">
        <span className="lbl">Удобный способ связи</span>
      </div>
      <div className="field">
        {CHANNELS.map((ch, i) => (
          <label
            className="checkbox"
            style={i < CHANNELS.length - 1 ? { marginBottom: "8px" } : undefined}
            key={ch.value}
          >
            <input
              type="radio"
              name="ch"
              checked={channel === ch.value}
              onChange={() => {
                setChannel(ch.value);
                setError("");
              }}
            />{" "}
            {ch.label}
          </label>
        ))}
      </div>
      {error && (
        <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "0 0 10px" }}>
          {error}
        </p>
      )}
      <button className="btn btn--primary btn--block" onClick={submit} disabled={busy}>
        Отправить сообщение
      </button>
      <p className="thanks">*** ОТВЕЧАЕМ В ТЕЧЕНИЕ ДНЯ ***</p>
      <div className="barcode"></div>
    </div>
  );
}
