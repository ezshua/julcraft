"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, type Priced } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import type { FinanceSettings } from "@/lib/currency";
import type {
  CalcCategory,
  CalcComponent,
  ConfigSnapshot,
  Selection,
} from "@/lib/calc";
import { buildSnapshot } from "@/lib/calc";
import { plural } from "@/lib/format";

// Модалка заявки на собранное украшение — копия div.modal-overlay#modal
// из mockup/configurator-config.html. Отправляет POST /api/orders с
// type=custom; сервер сам пересчитывает snapshot (клиенту не доверяем).
export default function OrderRequestModal({
  open,
  onClose,
  category,
  accusative,
  selections,
  componentsById,
  total,
  days,
  collageDataUrl,
  summary,
  finance,
  currencyCode,
}: {
  open: boolean;
  onClose: () => void;
  category: CalcCategory & { id: number };
  accusative: string;
  selections: Selection[];
  componentsById: Map<number, CalcComponent>;
  total: Priced;
  days: number;
  collageDataUrl: string | null;
  summary: string;
  finance: FinanceSettings;
  currencyCode: string;
}) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
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
      const configJson: Omit<ConfigSnapshot, "total" | "days" | "categoryWorkPrice"> = buildSnapshot(
        category.id,
        category,
        selections,
        componentsById,
        currency,
        finance,
      );
      // Сервер пересчитает total/days/workPrice из items — клиентские не отправляем.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          categoryId: category.id,
          customerName: name,
          contact,
          message,
          collageDataUrl,
          config: configJson,
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
    <div className={open ? "modal-overlay open" : "modal-overlay"} id="custom-modal">
      <div className="modal">
        <div className="m-head">
          <h3>Заявка на {accusative}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="m-photo">
          {collageDataUrl && (
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collageDataUrl} alt="Коллаж украшения" />
            </div>
          )}
          <div>
            <b>{summary || "Пока ничего не выбрано"}</b>
            <small>
              {formatPrice(total, currency, finance)} ·{" "}
              {days} {plural(days, ["день", "дня", "дней"])} · мастер свяжется сама
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
            placeholder="Пожелания к сборке, длине цепочки и т.п."
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
          <button className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Отмена
          </button>
        </div>
        <p className="thanks" style={{ marginTop: "14px", textAlign: "center", fontSize: ".72rem" }}>
          *** без предоплаты — цена и срок в чеке после звонка ***
        </p>
      </div>
    </div>
  );
}

// Локальная обёртка для суммы компонентов (не используется напрямую,
// но полезна при расширении breakdown в модалке)
export function componentsSum(
  selections: Selection[],
  componentsById: Map<number, CalcComponent>,
): number {
  let sum = 0;
  for (const sel of selections) {
    const c = componentsById.get(sel.componentId);
    if (!c) continue;
    sum += sel.qty * (c.priceMinor + c.processingPriceMinor);
  }
  return sum;
}
