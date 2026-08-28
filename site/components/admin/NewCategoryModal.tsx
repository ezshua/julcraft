"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { amountToMinor, type FinanceSettings } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import { slugify } from "@/lib/format";

// Модалка «Новая категория» — копия div.modal-overlay#modal-cat из mockup/admin/categories.html.
// «Стоимость работы» — в текущей валюте «Вид» (D-24): сохраняем «как ввели» + workPriceCurrency.
export default function NewCategoryModal({
  finance,
  currencyCode,
}: {
  finance: FinanceSettings;
  currencyCode: string;
}) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
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
      fd.append("kind", "categories");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) {
        setUploadError(text || "Не получилось загрузить файл");
        return;
      }
      const data = JSON.parse(text) as { path: string };
      setImage(data.path);
    } catch {
      setUploadError("Не получилось загрузить файл");
    } finally {
      setUploadBusy(false);
    }
  };
  const [workPrice, setWorkPrice] = useState("500");
  const [workPriceCurrency, setWorkPriceCurrency] = useState(currency.code);
  const [baseWorkDays, setBaseWorkDays] = useState("3");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Каждое открытие — чистая форма: состояние не переживает закрытие модалки.
  const openModal = () => {
    setName("");
    setSlug("");
    setImage("");
    setWorkPrice("500");
    setWorkPriceCurrency(currency.code);
    setBaseWorkDays("3");
    setError("");
    setBusy(false);
    setOpen(true);
  };

  // Автогенерация slug из названия (как в модалке товара): если slug ещё не
  // заполнен вручную — генерируем уникальный slugify(name) с суффиксом при коллизии.
  const autoSlug = async () => {
    if (slug) return;
    const base = slugify(name);
    if (base.length < 3) return;
    try {
      const res = await fetch("/api/admin/categories/slugs");
      if (!res.ok) return;
      const { slugs } = (await res.json()) as { slugs: string[] };
      const taken = new Set(slugs);
      let candidate = base;
      let n = 2;
      while (taken.has(candidate)) candidate = `${base}-${n++}`;
      setSlug(candidate);
    } catch {
      /* оставляем как есть */
    }
  };

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          image: image || null,
          workPrice: amountToMinor(Number(workPrice) || 0),
          workPriceCurrency,
          baseWorkDays: Number(baseWorkDays || 0),
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || "Не получилось создать категорию");
        setBusy(false);
        return;
      }
      const data = JSON.parse(text) as { id: number };
      setOpen(false);
      router.push(`/admin/categories?id=${data.id}`);
      router.refresh();
    } catch {
      setError("Не получилось создать категорию");
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn--primary btn--small" onClick={openModal}>
        + Новая категория
      </button>

      <div className={open ? "modal-overlay open" : "modal-overlay"} id="modal-cat">
        <div className="modal">
          <div className="m-head">
            <h3>Новая категория</h3>
            <button
              className="icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          <div className="field">
            <label>Название</label>
            <input
              type="text"
              placeholder="Браслеты"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void autoSlug()}
            />
          </div>
          <div className="field">
            <label>ID (URL)</label>
            <input
              type="text"
              placeholder="brs"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Изображение категории</label>
            <div
              className={
                image ? "dropzone has-photo" : dzDrag ? "dropzone is-drag" : "dropzone"
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
              {image ? (
                <>
                  <div className="dz-preview">
                    <img src={image} alt="Изображение категории" />
                  </div>
                  <div className="dz-meta">
                    <b>{uploadBusy ? "Загружаем…" : "Заменить изображение"}</b>
                    <small>SVG или PNG, до 2 МБ</small>
                    {uploadError && (
                      <small
                        style={{ color: "var(--rust)", display: "block", marginTop: 6 }}
                      >
                        {uploadError}
                      </small>
                    )}
                    <button
                      className="btn btn--secondary btn--small"
                      style={{ marginTop: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage("");
                      }}
                    >
                      Убрать изображение
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
                  <b>
                    {uploadBusy
                      ? "Загружаем…"
                      : "Перетащите изображение сюда или нажмите"}
                  </b>
                  <small>SVG или PNG, до 2 МБ</small>
                  {uploadError && (
                    <small
                      style={{ color: "var(--rust)", display: "block", marginTop: 6 }}
                    >
                      {uploadError}
                    </small>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/svg+xml,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  void uploadPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <label>Стоимость работы</label>
              <input
                type="number"
                step="0.01"
                placeholder="500"
                value={workPrice}
                onChange={(e) => setWorkPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Валюта</label>
              <select
                value={workPriceCurrency}
                onChange={(e) => setWorkPriceCurrency(e.target.value)}
              >
                {finance.currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <label>База срока, дн</label>
              <input
                type="number"
                placeholder="3"
                value={baseWorkDays}
                onChange={(e) => setBaseWorkDays(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "12px 0 0" }}>
              {error}
            </p>
          )}

          <div className="m-actions">
            <button className="btn btn--primary" onClick={() => void create()} disabled={busy}>
              Создать
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