"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import { slugify } from "@/lib/format";
import type { Product, ProductAvailability } from "@/drizzle/schema";

const AVAILABILITY_OPTIONS = [
  { value: "in_stock", label: "в наличии" },
  { value: "reserve", label: "резерв" },
  { value: "made_to_order", label: "под заказ" },
  { value: "out_of_stock", label: "нет на складе" },
] as const;

type Props = {
  categories: { id: number; name: string }[];
  /** Без product — режим «Новый товар» */
  product?: Product;
};

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function fromDateInput(s: string): string | null {
  return s ? new Date(`${s}T00:00:00Z`).toISOString() : null;
}

// Модалка товара — копия div.modal-overlay#modal из mockup/admin/products.html
// (табы Основное/Фото/SEO + D-13: select «Наличие», «Резерв до», «Дней под заказ»).
export default function ProductModal({ categories, product }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [categoryId, setCategoryId] = useState(
    product ? String(product.categoryId) : "",
  );
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [isNew, setIsNew] = useState(product?.isNew ?? false);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [availability, setAvailability] = useState(
    product?.availability ?? "in_stock",
  );
  const [reserveUntil, setReserveUntil] = useState(
    toDateInput(product?.reserveUntil ?? null),
  );
  const [orderDays, setOrderDays] = useState(
    product?.orderDays != null ? String(product.orderDays) : "7",
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    product?.metaDescription ?? "",
  );
  const [ogImage, setOgImage] = useState(product?.ogImage ?? "");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setError("");
    setTab(0);
    setOpen(true);
  };

  const autoSlug = async () => {
    if (slug) return;
    const base = slugify(name);
    if (!base) return;
    const res = await fetch("/api/admin/products/slugs");
    if (!res.ok) return;
    const { slugs } = (await res.json()) as { slugs: string[] };
    const taken = new Set(slugs.filter((s) => s !== product?.slug));
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) candidate = `${base}-${n++}`;
    setSlug((prev) => (prev !== "" ? prev : candidate));
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        name,
        slug,
        description,
        categoryId: Number(categoryId),
        price: Number(price),
        isNew,
        isFeatured,
        availability,
        reserveUntil: fromDateInput(reserveUntil),
        orderDays: availability === "made_to_order" ? Number(orderDays || 0) : null,
        images,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        ogImage: ogImage || null,
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
        setError(text || "Не получилось сохранить товар");
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Не получилось сохранить товар");
      setBusy(false);
    }
  };

  return (
    <>
      {product ? (
        <button
          className="icon-btn"
          style={{ width: 32, height: 32 }}
          title="Редактировать"
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
          + Добавить товар
        </button>
      )}

      <div className={open ? "modal-overlay open" : "modal-overlay"} id="modal">
        <div className="modal modal--wide">
          <div className="m-head">
            <h3>{product ? "Редактировать товар" : "Новый товар на витрину"}</h3>
            <button
              className="icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          <div className="tabs">
            {["Основное", "Фото", "SEO"].map((label, i) => (
              <span
                key={label}
                className={tab === i ? "tab is-active" : "tab"}
                onClick={() => setTab(i)}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="tab-pane" style={{ display: tab === 0 ? "" : "none" }}>
            <div className="field">
              <label>Название</label>
              <input
                type="text"
                placeholder="Брошь «...»"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void autoSlug()}
              />
            </div>
            <div className="field">
              <label>ID (URL)</label>
              <input
                type="text"
                placeholder="brosh-nazvanie"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="field--row">
              <div className="field">
                <label>Категория</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">— выберите —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Цена, ₽</label>
                <input
                  type="number"
                  placeholder="1 950"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Описание</label>
              <textarea
                placeholder="Что за вещь, из чего, какая история"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="field" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                />{" "}
                Новинка
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />{" "}
                Избранное (на главную)
              </label>
            </div>
            {/* D-13: select «Наличие» вместо чекбокса «В наличии» из макета */}
            <div className="field">
              <label>Наличие</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ProductAvailability)}
              >
                {AVAILABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {availability === "reserve" && (
              <div className="field">
                <label>Резерв до</label>
                <input
                  type="date"
                  value={reserveUntil}
                  onChange={(e) => setReserveUntil(e.target.value)}
                />
              </div>
            )}
            {availability === "made_to_order" && (
              <div className="field">
                <label>Дней под заказ</label>
                <input
                  type="number"
                  placeholder="7"
                  value={orderDays}
                  onChange={(e) => setOrderDays(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="tab-pane" style={{ display: tab === 1 ? "" : "none" }}>
            <ImageUploader
              kind="products"
              maxMB={5}
              accept="image/jpeg,image/png,image/webp"
              title="Перетащите фото сюда или нажмите"
              hint="JPG/PNG/WebP до 5 МБ · первое фото — обложка"
              onUploaded={(path) => {
                if (images.length >= 6) {
                  setError("Максимум 6 фото");
                  return;
                }
                setError("");
                setImages((prev) => [...prev, path]);
              }}
            >
              <div className="dz-example">
                {images.map((img, i) => (
                  <div
                    key={img}
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <div className="thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" />
                    </div>
                    <button
                      className="icon-btn"
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 20,
                        height: 20,
                        fontSize: ".6rem",
                        borderWidth: 2,
                      }}
                      title="Удалить фото"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImages((prev) => prev.filter((_, j) => j !== i));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <span>
                  уже загружено: {images.length} из 6
                </span>
              </div>
            </ImageUploader>
          </div>

          <div className="tab-pane" style={{ display: tab === 2 ? "" : "none" }}>
            <div className="field">
              <label>Meta title</label>
              <input
                type="text"
                placeholder="Брошь «Ромашковая» — JulCraft"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Meta description</label>
              <textarea
                placeholder="Эмаль по меди, ручная роспись, в одном экземпляре."
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label>OG-изображение</label>
              <input
                type="text"
                placeholder="/uploads/products/..."
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "12px 0 0" }}>
              {error}
            </p>
          )}

          <div className="m-actions">
            <button className="btn btn--primary" onClick={() => void save()} disabled={busy}>
              Сохранить товар
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