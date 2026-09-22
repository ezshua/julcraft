"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoGrid from "./PhotoGrid";
import { slugify } from "@/lib/format";
import { toLS } from "@/lib/localize";
import LocalizedField, { type LocalizedValue } from "./LocalizedField";
import { useAdminDict } from "./admin-dict-context";
import {
  amountToMinor,
  minorToAmount,
  type FinanceSettings,
} from "@/lib/currency";
import type { Product, ProductAvailability } from "@/drizzle/schema";

const AVAILABILITY_OPTIONS = [
  { value: "in_stock", key: "availStock" },
  { value: "reserve", key: "availReserve" },
  { value: "made_to_order", key: "availOrder" },
  { value: "out_of_stock", key: "availNone" },
] as const;


type Props = {
  categories: { id: number; name: string }[];
  /** Без product — режим «Новый товар» */
  product?: Product;
  finance: FinanceSettings;
  currencyCode: string;
};

const EMPTY: LocalizedValue = { ru: "", en: "", uk: "" };

type FormState = {
  name: LocalizedValue;
  slug: string;
  categoryId: string;
  price: string;
  priceCurrency: string;
  description: LocalizedValue;
  isNew: boolean;
  isFeatured: boolean;
  availability: ProductAvailability;
  reserveUntil: string;
  orderDays: string;
  images: string[];
  metaTitle: LocalizedValue;
  metaDescription: LocalizedValue;
  ogImage: string;
};

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function fromDateInput(s: string): string | null {
  return s ? new Date(`${s}T00:00:00Z`).toISOString() : null;
}

// Снимок формы, по которому считаем «грязность». Для price важна
// именно введённая строка, потому что при открытии мы её пересчитываем
// из миноров в текущую валюту; сравниваем с тем, что лежит в state.
function buildSnapshot(p: Product | undefined, currencyCode: string): FormState {
  if (!p) {
    return {
      name: { ...EMPTY },
      slug: "",
      categoryId: "",
      price: "",
      priceCurrency: currencyCode,
      description: { ...EMPTY },
      isNew: false,
      isFeatured: false,
      availability: "in_stock",
      reserveUntil: "",
      orderDays: "7",
      images: [],
      metaTitle: { ...EMPTY },
      metaDescription: { ...EMPTY },
      ogImage: "",
    };
  }
  return {
    name: toLS(p.name),
    slug: p.slug,
    categoryId: String(p.categoryId),
    price: "", // filled after mount, see useEffect
    priceCurrency: p.priceCurrency,
    description: toLS(p.description),
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    availability: p.availability,
    reserveUntil: toDateInput(p.reserveUntil ?? null),
    orderDays: p.orderDays != null ? String(p.orderDays) : "7",
    images: [...p.images],
    metaTitle: toLS(p.metaTitle),
    metaDescription: toLS(p.metaDescription),
    ogImage: p.ogImage ?? "",
  };
}

// Глубокое сравнение «грязности». Все поля формы — примитивы
// или массив строк, рекурсия тут не нужна.
function isDirty(a: FormState, b: FormState): boolean {
  if (a === b) return false;
  for (const k of Object.keys(a) as (keyof FormState)[]) {
    const av = a[k];
    const bv = b[k];
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return true;
      for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return true;
    } else if (av !== bv) {
      return true;
    }
  }
  return false;
}

// Модалка товара — копия div.modal-overlay#modal из mockup/admin/products.html
// (табы Основное/Фото/SEO + D-13: select «Наличие», «Резерв до», «Дней под заказ»).
// Цена — в текущей валюте «Вид» (D-24): при открытии конвертируется из хранимой
// валюты в текущую, при сохранении — сохраняется «как ввели» + priceCurrency.
//
// Кнопки «Сохранить» и «Отмена» зависят от isDirty:
//   * пустая форма (только что открыли)  → «Сохранить» disabled, «Отмена» закрывает;
//   * что-то поменяли                   → «Сохранить» активен + класс is-dirty;
//   * «Отмена» / крестик / клик по фону → если есть правки, спрашиваем подтверждение.
export default function ProductModal({ categories, product, finance, currencyCode }: Props) {
  const router = useRouter();
  const d = useAdminDict().products;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const [form, setForm] = useState<FormState>(() => buildSnapshot(product, currencyCode));
  const [snapshot, setSnapshot] = useState<FormState>(() => buildSnapshot(product, currencyCode));

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Снимок формы на момент открытия (или смены валюты/продукта).
  // Инициализируем форму при переходе из закрытого в открытое состояние.
  // Раньше при повторном открытии товара подтягивалась только цена; остальные
  // поля оставались от прошлого открытия (баг «первое редактирование работает,
  // второе — нет»). wasOpenRef отслеживает переход, без setState при !open.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const base = buildSnapshot(product, currencyCode);
      if (product) {
        // Цена правится в явно выбранной валюте товара (priceCurrency) —
        // конвертация в валюту «Вид» не нужна.
        base.price = String(minorToAmount(product.price));
      }
      setForm(base);
      setSnapshot(base);
    }
    wasOpenRef.current = open;
  }, [open, product, finance, currencyCode]);

  const dirty = isDirty(form, snapshot);

  const closeWithConfirm = () => {
    if (busy) return;
    if (dirty) {
      const ok = window.confirm(d.confirmClose);
      if (!ok) return;
    }
    setOpen(false);
  };

  // Закрытие по клику на тёмный фон (но не по самой модалке)
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeWithConfirm();
  };

  // Предупреждение при уходе со страницы с несохранёнными правками
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const openCreate = () => {
    setError("");
    setTab(0);
    setForm(buildSnapshot(undefined, currencyCode));
    setSnapshot(buildSnapshot(undefined, currencyCode));
    setOpen(true);
  };

  const autoSlug = async () => {
    if (form.slug) return;
    const base = slugify(form.name.ru);
    if (!base) return;
    const res = await fetch("/api/admin/products/slugs");
    if (!res.ok) return;
    const { slugs } = (await res.json()) as { slugs: string[] };
    const taken = new Set(slugs.filter((s) => s !== product?.slug));
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) candidate = `${base}-${n++}`;
    setField("slug", form.slug !== "" ? form.slug : candidate);
  };

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        categoryId: Number(form.categoryId),
        price: amountToMinor(Number(form.price) || 0),
        priceCurrency: form.priceCurrency,
        isNew: form.isNew,
        isFeatured: form.isFeatured,
        availability: form.availability,
        reserveUntil: fromDateInput(form.reserveUntil),
        orderDays:
          form.availability === "made_to_order" ? Number(form.orderDays || 0) : null,
        images: form.images,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        ogImage: form.ogImage || null,
      };
      const res = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        setError(text || d.errorSave);
        setBusy(false);
        return;
      }
      // Снимок обновляем до закрытия, чтобы при следующем открытии
      // форма не считала «грязной» то, что мы только что сохранили.
      setSnapshot(form);
      setOpen(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError(d.errorSave);
      setBusy(false);
    }
  };

  return (
    <>
      {product ? (
        <button
          className="icon-btn"
          style={{ width: 32, height: 32 }}
          title={d.modalEdit}
          onClick={() => {
            setError("");
            setTab(0);
            setOpen(true);
          }}
        >
          ✎
        </button>
      ) : (
        <button className="btn btn--primary btn--small" onClick={openCreate}>
          {d.newButton}
        </button>
      )}

      <div
        className={open ? "modal-overlay open" : "modal-overlay"}
        id="modal"
        onClick={onOverlayClick}
      >
        <div className="modal modal--wide">
          <div className="m-head">
            <h3>{product ? d.modalEdit : d.modalCreate}</h3>
            <button
              className="icon-btn"
              onClick={closeWithConfirm}
              aria-label={d.modalCloseAria}
              disabled={busy}
            >
              ✕
            </button>
          </div>

          <div className="tabs">
            {[
              { key: "tabMain", label: d.tabMain },
              { key: "tabPhotos", label: d.tabPhotos },
              { key: "tabSeo", label: d.tabSeo },
            ].map((t, i) => (
              <span
                key={t.key}
                className={tab === i ? "tab is-active" : "tab"}
                onClick={() => setTab(i)}
              >
                {t.label}
              </span>
            ))}
          </div>

          <div className="tab-pane" style={{ display: tab === 0 ? "" : "none" }}>
            <div className="field">
              <LocalizedField
                value={form.name}
                onChange={(v) => setField("name", v)}
                label={d.labelName}
                placeholder={d.placeholderName}
              />
            </div>
            <div className="field--row">
              <div className="field">
                <label>{d.labelSlug}</label>
                <input
                  type="text"
                  placeholder={d.placeholderSlug}
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                />
              </div>
              <div className="field">
                <label>{d.labelCategory}</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                >
                  <option value="">{d.emptySelect}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field--row">
              <div className="field">
                <label>{d.labelPrice}</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={d.placeholderPrice}
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </div>
              <div className="field">
                <label>{d.labelCurrency}</label>
                <select
                  value={form.priceCurrency}
                  onChange={(e) => setField("priceCurrency", e.target.value)}
                >
                  {finance.currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <LocalizedField
                value={form.description}
                onChange={(v) => setField("description", v)}
                label={d.labelDescription}
                multiline
                placeholder={d.placeholderDescription}
              />
            </div>
            <div className="field" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.isNew}
                  onChange={(e) => setField("isNew", e.target.checked)}
                />{" "}
                {d.labelNew}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setField("isFeatured", e.target.checked)}
                />{" "}
                {d.labelFeat}
              </label>
            </div>
            {/* D-13: select availability instead of a checkbox from the mockup */}
            <div className="field">
              <label>{d.labelAvail}</label>
              <select
                value={form.availability}
                onChange={(e) =>
                  setField("availability", e.target.value as ProductAvailability)
                }
              >
                {AVAILABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {d[o.key]}
                  </option>
                ))}
              </select>
            </div>
            {form.availability === "reserve" && (
              <div className="field">
                <label>{d.labelReserveUntil}</label>
                <input
                  type="date"
                  value={form.reserveUntil}
                  onChange={(e) => setField("reserveUntil", e.target.value)}
                />
              </div>
            )}
            {form.availability === "made_to_order" && (
              <div className="field">
                <label>{d.labelOrderDays}</label>
                <input
                  type="number"
                  placeholder="7"
                  value={form.orderDays}
                  onChange={(e) => setField("orderDays", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="tab-pane" style={{ display: tab === 1 ? "" : "none" }}>
            <PhotoGrid
              images={form.images}
              onChange={(next) => setField("images", next)}
              kind="products"
              maxMB={5}
              accept="image/jpeg,image/png,image/webp"
              hint={d.photoHint}
              dict={d}
            />
          </div>
          <div className="tab-pane" style={{ display: tab === 2 ? "" : "none" }}>
            <div className="field">
              <LocalizedField
                value={form.metaTitle}
                onChange={(v) => setField("metaTitle", v)}
                label="Meta title"
                placeholder={d.placeholderMetaTitle}
              />
            </div>
            <div className="field">
              <LocalizedField
                value={form.metaDescription}
                onChange={(v) => setField("metaDescription", v)}
                label="Meta description"
                multiline
                placeholder={d.placeholderMetaDescription}
              />
            </div>
            <div className="field">
              <label>{d.labelOgImage}</label>
              <input
                type="text"
                placeholder={d.placeholderOgImage}
                value={form.ogImage}
                onChange={(e) => setField("ogImage", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "12px 0 0" }}>
              {error}
            </p>
          )}

          <div className="m-actions">
            <button
              className={`btn btn--primary${dirty ? " is-dirty" : ""}`}
              onClick={() => void save()}
              disabled={busy || !dirty}
              title={
                dirty
                  ? d.saveChanges
                  : d.noChanges
              }
            >
              {product
                ? dirty
                  ? d.saveChanges
                  : d.save
                : d.saveProduct}
            </button>
            <button
              className="btn btn--secondary"
              onClick={closeWithConfirm}
              disabled={busy}
            >
              {d.cancel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}