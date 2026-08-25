"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  amountToMinor,
  minorToAmount,
  convertPriced,
  asPriced,
  findCurrency,
  type FinanceSettings,
} from "@/lib/currency";
import type { Component } from "@/drizzle/schema";

// Опция выбора типа — данные из таблицы componentTypes (план componentsExt).
export type ComponentTypeOption = { value: string; label: string };


type Props = {
  /** Без component — режим «Новое комплектующее» */
  component?: Component;
  finance: FinanceSettings;
  currencyCode: string;
  /** Активные типы из БД; первый по sortOrder — дефолт для новой записи. */
  typeOptions: ComponentTypeOption[];
};

// Модалка комплектующего — копия div.modal-overlay#modal из mockup/admin/components.html.
// Цена и обработка — в НЕЗАВИСИМЫХ валютах (Q-10/D-24): у каждого поля свой
// селект валюты; при смене валюты число пересчитывается в неё.
export default function ComponentModal({
  component,
  finance,
  currencyCode,
  typeOptions,
}: Props) {
  const router = useRouter();

  // Пересчёт числа поля при смене его валюты (полная точность, округление на выводе)
  const reprice = (
    amountStr: string,
    fromCode: string,
    toCode: string,
  ): string => {
    const amt = Number(amountStr) || 0;
    if (!fromCode || fromCode === toCode) return String(amt);
    const to = findCurrency(finance, toCode);
    return String(
      minorToAmount(convertPriced(asPriced(amountToMinor(amt), fromCode), to, finance).priceMinor),
    );
  };
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(component?.name ?? "");
  const [componentType, setComponentType] = useState(
    component?.componentType ?? "",
  );

  // У новой записи — первый активный тип из БД. У существующей храним
  // сохранённый код даже если его нет в списке (тип могли деактивировать),
  // чтобы открытие модалки не подменяло данные; такой код показываем первой
  // опцией с пометкой.
  const typeKnown = typeOptions.some((o) => o.value === componentType);
  const selectValue =
    component && !typeKnown
      ? componentType
      : componentType || typeOptions[0]?.value || "";
  const selectOptions =
    component && !typeKnown
      ? [
          { value: componentType, label: componentType + " (текущий тип)" },
          ...typeOptions,
        ]
      : typeOptions;
  const [stockQty, setStockQty] = useState(
    component ? String(component.stockQty) : "0",
  );
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState(
    component?.priceCurrency || currencyCode,
  );
  const [processingPrice, setProcessingPrice] = useState("");
  const [processingPriceCurrency, setProcessingPriceCurrency] = useState(
    component?.processingPriceCurrency || currencyCode,
  );
  const [processingDays, setProcessingDays] = useState(
    component ? String(component.processingDays) : "0",
  );
  const [isOrderable, setIsOrderable] = useState(component?.isOrderable ?? false);
  const [isActive, setIsActive] = useState(component?.isActive ?? true);
  const [deliveryDays, setDeliveryDays] = useState(
    component?.deliveryDays != null ? String(component.deliveryDays) : "7",
  );
  const [photo, setPhoto] = useState(component?.photo ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dzDrag, setDzDrag] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadPhoto = async (file: File | undefined) => {
    if (!file || uploadBusy) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Файл больше 2 МБ");
      return;
    }
    setUploadBusy(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("kind", "components");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) {
        setUploadError(text || "Не получилось загрузить файл");
        return;
      }
      const data = JSON.parse(text) as { path: string };
      setPhoto(data.path);
    } catch {
      setUploadError("Не получилось загрузить файл");
    } finally {
      setUploadBusy(false);
    }
  };

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
        price: amountToMinor(Number(price) || 0),
        priceCurrency,
        processingPrice: amountToMinor(Number(processingPrice) || 0),
        processingPriceCurrency,
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
            setPrice(String(minorToAmount(component.price)));
            setPriceCurrency(component.priceCurrency);
            setProcessingPrice(String(minorToAmount(component.processingPrice)));
            setProcessingPriceCurrency(component.processingPriceCurrency);
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
                  <img src={photo} alt="Фото комплектующего" />
                </div>
                <div className="dz-meta">
                  <b>{uploadBusy ? "Загружаем…" : "Заменить фото"}</b>
                  <small>прозрачный или белый фон · один ракурс · квадрат · до 2 МБ</small>
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
                    Убрать фото
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="dz-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </div>
                <b>{uploadBusy ? "Загружаем…" : "Перетащите PNG сюда или нажмите"}</b>
                <small>прозрачный или белый фон · один ракурс · квадрат · до 2 МБ</small>
                {uploadError && (
                  <small style={{ color: "var(--rust)", display: "block", marginTop: 6 }}>
                    {uploadError}
                  </small>
                )}
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
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              style={{ display: "none" }}
              onChange={(e) => {
                void uploadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

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
                value={selectValue}
                onChange={(e) => setComponentType(e.target.value)}
              >
                {selectOptions.map((o) => (
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
              <label>Цена</label>
              <input
                type="number"
                step="0.01"
                placeholder="200"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Валюта цены</label>
              <select
                value={priceCurrency}
                onChange={(e) => {
                  const to = e.target.value;
                  setPrice(reprice(price, priceCurrency, to));
                  setPriceCurrency(to);
                }}
              >
                {finance.currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Обработка</label>
              <input
                type="number"
                step="0.01"
                placeholder="50"
                value={processingPrice}
                onChange={(e) => setProcessingPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Валюта обработки</label>
              <select
                value={processingPriceCurrency}
                onChange={(e) => {
                  const to = e.target.value;
                  setProcessingPrice(reprice(processingPrice, processingPriceCurrency, to));
                  setProcessingPriceCurrency(to);
                }}
              >
                {finance.currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
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