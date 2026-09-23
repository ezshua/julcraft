"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries/ru";

type ContactFormDict = Dictionary["contacts"]["form"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEGRAM_RE = /^@?[a-zA-Z0-9_]{5,32}$/;
const TME_PREFIX_RE = /^https?:\/\/t\.me\//i;
const NON_DIGITS_RE = /\D/g;

// Форма обратной связи — копия чека из mockup/contacts.html.
// Успех → редирект на /order-success/{id} (R-3, чек type=contact).
// Иллюстрация к сообщению: публичная загрузка /api/upload?kind=contacts
// (без авторизации, как у комплектующих, но с отдельным kind).
export default function ContactForm({ dict }: { dict: ContactFormDict }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("phone");
  const [photo, setPhoto] = useState("");
  const [dzDrag, setDzDrag] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const uploadPhoto = async (file: File | undefined) => {
    if (!file || uploadBusy) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(dict.photoTooBig);
      return;
    }
    setUploadBusy(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("kind", "contacts");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) {
        setUploadError(text || dict.photoError);
        return;
      }
      const data = JSON.parse(text) as { path: string };
      setPhoto(data.path);
    } catch {
      setUploadError(dict.photoError);
    } finally {
      setUploadBusy(false);
    }
  };

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
        body: JSON.stringify({ name, contact, message, channel, photoPath: photo || "" }),
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
      <div className="field" style={{ marginTop: "14px" }}>
        <label>{dict.labelPhoto}</label>
        <div
          className={
            photo ? "dropzone has-photo" : dzDrag ? "dropzone is-drag" : "dropzone"
          }
          style={{ cursor: "pointer" }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDzDrag(true);
          }}
          onDragLeave={() => setDzDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDzDrag(false);
            void uploadPhoto(e.dataTransfer.files?.[0]);
          }}
        >
          {photo ? (
            <>
              <div className="dz-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={dict.photoAlt} />
              </div>
              <div className="dz-meta">
                <b>{uploadBusy ? dict.uploading : dict.dzReplace}</b>
                <small>{dict.dzHint}</small>
                {uploadError && (
                  <small style={{ color: "var(--rust)", display: "block", marginTop: 6 }}>
                    {uploadError}
                  </small>
                )}
                <button
                  className="btn btn--secondary btn--small"
                  style={{ marginTop: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhoto("");
                  }}
                >
                  {dict.dzRemove}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="dz-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </div>
              <b>{uploadBusy ? dict.uploading : dict.dzUpload}</b>
              <small>{dict.dzHint}</small>
              {uploadError && (
                <small style={{ color: "var(--rust)", display: "block", marginTop: 6 }}>
                  {uploadError}
                </small>
              )}
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              void uploadPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
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
