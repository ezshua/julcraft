"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import { amountToUsdCents, usdCentsToAmount, type FinanceSettings } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import type { Component, ComponentType } from "@/drizzle/schema";

export const TYPE_OPTIONS = [
  { value: "stone", label: "stone — камень" },
  { value: "pendant", label: "pendant — подвеска" },
  { value: "bead", label: "bead — бусина" },
  { value: "cord", label: "cord — шнур и цепь" },
  { value: "clasp", label: "clasp — застёжка" },
  { value: "base", label: "base — основа" },
] as const;

type Props = {
  /** Без component — режим «Новое комплектующее» */
  component?: Component;
  finance: FinanceSettings;
  currencyCode: string;
};

// Модалка комплектующего — копия div.modal-overlay#modal из mockup/admin/components.html.
// Цены — в выбранной валюте (D-24), в БД сохраняются USD-центы.
export default function ComponentModal({ component, finance, currencyCode }: Props) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(component?.name ?? "");
  const [componentType, setComponentType] = useState(
    component?.componentType ?? "stone",
  );
  const [stockQty, setStockQty] = useState(
    component ? String(component.stockQty) : "0",
  );
  const [price, setPrice] = useState("");
  const [processingPrice, setProcessingPrice] = useState("");
  const [processingDays, setProcessingDays] = useState(
    component ? String(component.processingDays) : "0",
  );
  const [isOrderable, setIsOrderable] = useState(component?.isOrderable ?? false);
  const [isActive, setIsActive] = useState(component?.isActive ?? true);
  const [deliveryDays, setDeliveryDays] = useState(
    component?.deliveryDays != null ? String(component.deliveryDays) : "7",
  );
  const [photo, setPhoto] = useState(component?.photo ?? "");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        name,
        componentType,
        price: amountToUsdCents(Number(price) || 0, currency.ratePerUsd),
        processingPrice: amountToUsdCents(Number(processingPrice) || 0, currency.ratePerUsd),
        processingDays: Number(processingDays || 0),
        stockQty: Number(stockQty || 0),
        isOrderable,
        isActive,
        deliveryDays: isOrderable ? Number(deliveryDays || 0) : null,
        photo,
      };
      const res = await fetch(
        component ? `/api/admin/components/${component.id}` : "/api/admin/components",
        {
          method: component ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        setError(text || "Не получилось сохранить комплектующее");
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Не получилось сохранить комплектующее");
      setBusy(false);
    }
  };

  return (
    <>
      {component ? (
        <button
          className="icon-btn"
          style={{ width: 32, height: 32 }}
          title="Редактировать"
          onClick={() => {
            setError("");
            setPrice(String(usdCentsToAmount(component.price, currency.ratePerUsd)));
            setProcessingPrice(
              String(usdCentsToAmount(component.processingPrice, currency.ratePerUsd)),
            );
            setOpen(true);
          }}
        >
          ✎
        </button>
      ) : (
        <button
          className="btn btn--primary btn--small"
          onClick={() => {
            setPrice("");
            setProcessingPrice("");
            setOpen(true);
          }}
        >
          + Добавить комплектующее
        </button>
      )}

      <div className={open ? "modal-overlay open" : "modal-overlay"} id="modal">
        <div className="modal modal--wide">
          <div className="m-head">
            <h3>
              {component ? "Редактировать комплектующее" : "Новое комплектующее на склад"}
            </h3>
            <button
              className="icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          <ImageUploader
            kind="components"
            maxMB={2}
            accept="image/png"
            title="Фото для коллажа — PNG"
            hint="прозрачный или белый фон · один ракурс · квадрат · до 2 МБ. Это важно: коллаж собирается сервером (sharp)"
            onUploaded={(path) => {
              setError("");
              setPhoto(path);
            }}
          >
            <div className="dz-example">
              <div className="thumb">
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <circle cx="12" cy="12" r="9" fill="#e8b64c" stroke="#22242a" strokeWidth="2" />
                </svg>
              </div>
              <div className="thumb">
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <path d="M12 2l7 7-7 13L5 9z" fill="#d0785a" stroke="#22242a" strokeWidth="2" />
                </svg>
              </div>
              <span>так — хорошо</span>
            </div>
          </ImageUploader>

          <div className="field">
            <label>Название</label>
            <input
              type="text"
              placeholder="Камень «...»"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field--row">
            <div className="field">
              <label>Тип (componentType)</label>
              <select
                value={componentType}
                onChange={(e) =>
                  setComponentType(e.target.value as ComponentType)
                }
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Остаток, шт</label>
              <input
                type="number"
                placeholder="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <label>Цена, {currency.symbol}</label>
              <input
                type="number"
                step="0.01"
                placeholder="200"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Обработка, {currency.symbol}</label>
              <input
                type="number"
                step="0.01"
                placeholder="50"
                value={processingPrice}
                onChange={(e) => setProcessingPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Дни обработки</label>
              <input
                type="number"
                placeholder="0"
                value={processingDays}
                onChange={(e) => setProcessingDays(e.target.value)}
              />
            </div>
          </div>
          <div className="field" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={isOrderable}
                onChange={(e) => setIsOrderable(e.target.checked)}
              />{" "}
              Можно заказать у поставщика
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />{" "}
              Активно на складе
            </label>
          </div>
          <div className="field">
            <label>Срок поставки, дн</label>
            <input
              type="number"
              placeholder="7"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "12px 0 0" }}>
              {error}
            </p>
          )}

          <div className="m-actions">
            <button className="btn btn--primary" onClick={() => void save()} disabled={busy}>
              Сохранить на склад
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </>
  );
}