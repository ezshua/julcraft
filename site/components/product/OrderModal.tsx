"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatPrice, asPriced } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import type { FinanceSettings } from "@/lib/currency";
import type { Dictionary } from "@/lib/dictionaries/ru";
import { L } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";
import type { Product } from "@/drizzle/schema";

// Модалка заявки на товар — копия div.modal-overlay#modal из mockup/product.html.
// Кнопка «Заказать» открывает модалку (класс .open, как в макете).
export default function OrderModal({
  product,
  finance,
  currencyCode,
  dict,
  availText,
  modalTitle,
  locale,
}: {
  product: Product;
  finance: FinanceSettings;
  currencyCode: string;
  dict: Dictionary["product"];
  availText: string;
  modalTitle: string;
  locale: Locale;
}) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [open, setOpen] = useState(false);
  const [mounted] = useState(() => typeof document !== "undefined");

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "product",
          productId: product.id,
          customerName: name,
          contact,
          message,
        }),
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

  return (
    <>
      <button className="btn btn--primary" onClick={() => setOpen(true)}>
        {dict.orderButton}
      </button>

      {mounted &&
        createPortal(
          <div className={open ? "modal-overlay open" : "modal-overlay"} id="modal">
        <div className="modal">
          <div className="m-head">
            <h3>{modalTitle}</h3>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label={dict.closeAria}>
              ✕
            </button>
          </div>
          <div className="m-photo">
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.images[0]} alt={L(product.name, locale)} />
            </div>
            <div>
              <b>{L(product.name, locale)}</b>
              <small>
                {formatPrice(asPriced(product.price, product.priceCurrency), currency, finance)} · {availText} · {dict.masterNote}
              </small>
            </div>
          </div>
          <div className="field">
            <label>{dict.fieldName}</label>
            <input
              type="text"
              placeholder={dict.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{dict.fieldContact}</label>
            <input
              type="tel"
              placeholder={dict.contactPlaceholder}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{dict.fieldComment}</label>
            <textarea
              placeholder={dict.commentPlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {error && (
            <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "0 0 10px" }}>
              {error}
            </p>
          )}
          <div className="m-actions">
            <button className="btn btn--primary" onClick={submit} disabled={busy}>
              {dict.submit}
            </button>
            <button className="btn btn--secondary" onClick={() => setOpen(false)} disabled={busy}>
              {dict.cancel}
            </button>
          </div>
          <p className="thanks" style={{ marginTop: "14px", textAlign: "center", fontSize: ".72rem" }}>
            {dict.noPrepayment}
          </p>
        </div>
          </div>,
          document.body
        )}
    </>
  );
}
