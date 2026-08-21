"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, asPriced, imgWith } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import type { FinanceSettings } from "@/lib/currency";
import { availFullText } from "@/components/ui/Avail";
import type { Product } from "@/drizzle/schema";

// Модалка заявки на товар — копия div.modal-overlay#modal из mockup/product.html.
// Кнопка «Заказать» открывает модалку (класс .open, как в макете).
export default function OrderModal({
  product,
  finance,
  currencyCode,
}: {
  product: Product;
  finance: FinanceSettings;
  currencyCode: string;
}) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [open, setOpen] = useState(false);
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
        setError(text || "Не получилось отправить заявку — попробуйте ещё раз");
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { id: number };
      router.push(`/order-success/${data.id}`);
    } catch {
      setError("Не получилось отправить заявку — попробуйте ещё раз");
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn--primary" onClick={() => setOpen(true)}>
        Заказать
      </button>

      <div className={open ? "modal-overlay open" : "modal-overlay"} id="modal">
        <div className="modal">
          <div className="m-head">
            <h3>Заявка на {product.name}</h3>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть">
              ✕
            </button>
          </div>
          <div className="m-photo">
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgWith(product.images[0], 300)} alt={product.name} />
            </div>
            <div>
              <b>{product.name}</b>
              <small>
                {formatPrice(asPriced(product.price, product.priceCurrency), currency, finance)} · {availFullText(product)} · мастер свяжется сама
              </small>
            </div>
          </div>
          <div className="field">
            <label>Имя</label>
            <input
              type="text"
              placeholder="Как к вам обращаться"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Контакт</label>
            <input
              type="tel"
              placeholder="Телефон, email или Telegram"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Комментарий</label>
            <textarea
              placeholder="Цепочка длиннее/короче, пожелания — что угодно"
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
              Отправить заявку
            </button>
            <button className="btn btn--secondary" onClick={() => setOpen(false)} disabled={busy}>
              Отмена
            </button>
          </div>
          <p className="thanks" style={{ marginTop: "14px", textAlign: "center", fontSize: ".72rem" }}>
            *** без предоплаты — цена и срок в чеке после звонка ***
          </p>
        </div>
      </div>
    </>
  );
}
