"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries/ru";

type ContactFormDict = Dictionary["contacts"]["form"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEGRAM_RE = /^@?[a-zA-Z0-9_]{5,32}$/;
const TME_PREFIX_RE = /^https?:\/\/t\.me\//i;
const NON_DIGITS_RE = /\D/g;

// Форма обратной связи — копия чека из mockup/contacts.html.
// Успех → редирект на /order-success/{id} (R-3, чек type=contact).
export default function ContactForm({ dict }: { dict: ContactFormDict }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const contactErr = contact.trim() ? contactError(contact, channel, dict) : "";

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) {
      setError(dict.errorName);
      return;
    }
    if (!contact.trim()) {
      setError(dict.errorContact);
      return;
    }
    if (!message.trim()) {
      setError(dict.errorMessage);
      return;
    }
    const cErr = contactError(contact, channel, dict);
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
        setError(text || dict.submitError);
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { id: number };
      router.push(`/order-success/${data.id}`);
    } catch {
      setError(dict.submitError);
      setBusy(false);
    }
  };

  const contactHint = () => {
    if (channel === "telegram") return dict.hintTelegram;
    if (channel === "email") return dict.hintEmail;
    return dict.hintPhone;
  };

  return (
    <div className="receipt receipt--form" style={{ maxWidth: "100%", margin: 0 }}>
      <h2>{dict.title}</h2>
      <div className="row">
        <span className="lbl">{dict.fieldName}</span>
      </div>
      <div className="field">
        <input
          type="text"
          placeholder={dict.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="row">
        <span className="lbl">{dict.fieldContact}</span>
      </div>
      <div className="field">
        <input
          type="text"
          placeholder={contactHint()}
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
        <span className="lbl">{dict.fieldMessage}</span>
      </div>
      <div className="field">
        <textarea
          placeholder={dict.messagePlaceholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <div className="row">
        <span className="lbl">{dict.fieldChannel}</span>
      </div>
      <div className="field">
        {(
          [
            { value: "phone", label: dict.channelPhone },
            { value: "telegram", label: dict.channelTelegram },
            { value: "email", label: dict.channelEmail },
          ] as const
        ).map((ch, i, arr) => (
          <label
            className="checkbox"
            style={i < arr.length - 1 ? { marginBottom: "8px" } : undefined}
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
        {dict.submit}
      </button>
      <p className="thanks">{dict.thanks}</p>
      <div className="barcode"></div>
    </div>
  );
}

function contactError(contact: string, channel: string, dict: ContactFormDict): string {
  const v = contact.trim();
  if (channel === "email") {
    return EMAIL_RE.test(v) ? "" : dict.errorEmail;
  }
  if (channel === "telegram") {
    return TELEGRAM_RE.test(v.replace(TME_PREFIX_RE, "")) ? "" : dict.errorTelegram;
  }
  const digits = v.replace(NON_DIGITS_RE, "");
  return digits.length >= 10 && digits.length <= 15 ? "" : dict.errorPhone;
}
