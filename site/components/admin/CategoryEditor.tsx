"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComponentTypeOption } from "./ComponentModal";
import { plural } from "@/lib/format";
import {
  amountToMinor,
  minorToAmount,
  type FinanceSettings,
} from "@/lib/currency";

export type EditorSlot = {
  id: number | null;
  name: string;
  componentType: string;
  minQty: number;
  maxQty: number;
};

export type EditorCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  workPrice: number;
  workPriceCurrency: string;
  baseWorkDays: number;
  isActive: boolean;
  hasSlotTemplate: boolean;
  slots: EditorSlot[];
};

type SlotState = EditorSlot & { key: number };

type Props = {
  category: EditorCategory;
  finance: FinanceSettings;
  currencyCode: string;
  /** Активные типы из БД; первый по sortOrder — для нового слота. */
  typeOptions: ComponentTypeOption[];
};

// Правая панель: форма категории + редактор слотов (копия mockup/admin/categories.html).
// Серверный page рендерит компонент с key={category.id} — при смене категории состояние сбрасывается.
// Стоимость работы — в выбранной валюте (D-24): у поля свой селект валюты.
export default function CategoryEditor({
  category,
  finance,
  currencyCode,
  typeOptions,
}: Props) {
  const router = useRouter();
  const keyCounter = useRef(1000);
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description);
  const [image, setImage] = useState(category.image ?? "");
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
  const [workPrice, setWorkPrice] = useState(String(minorToAmount(category.workPrice)));
  const [workPriceCurrency, setWorkPriceCurrency] = useState(
    category.workPriceCurrency || currencyCode,
  );
  const [baseWorkDays, setBaseWorkDays] = useState(String(category.baseWorkDays));
  const [isActive, setIsActive] = useState(category.isActive);
  const [hasSlotTemplate, setHasSlotTemplate] = useState(category.hasSlotTemplate);
  const [slots, setSlots] = useState<SlotState[]>(
    category.slots.map((s, i) => ({ ...s, key: i + 1 })),
  );

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Dirty-tracking: кнопка активна только при несохранённых изменениях.
  // Снимок игнорирует служебный `key` слотов, сравниваются только данные.
  const initialRef = useRef<string | null>(null);
  const currentSig = JSON.stringify({
    name,
    slug,
    description,
    image,
    workPrice,
    workPriceCurrency,
    baseWorkDays,
    isActive,
    hasSlotTemplate,
    slots: slots.map(({ key, ...rest }) => rest),
  });
  if (initialRef.current === null) initialRef.current = currentSig;
  const isDirty = currentSig !== initialRef.current;

  const patchSlot = (key: number, patch: Partial<SlotState>) =>
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const moveSlot = (index: number, dir: -1 | 1) =>
    setSlots((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const removeSlot = (key: number) =>
    setSlots((prev) => prev.filter((s) => s.key !== key));

  const addSlot = () =>
    setSlots((prev) => [
      ...prev,
      {
        key: ++keyCounter.current,
        id: null,
        name: "Новый слот",
        componentType: "stone",
        minQty: 1,
        maxQty: 1,
      },
    ]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          image: image || null,
          workPrice: amountToMinor(Number(workPrice) || 0),
          workPriceCurrency,
          baseWorkDays: Number(baseWorkDays || 0),
          isActive,
          hasSlotTemplate,
          slots: slots.map((s, i) => ({
            id: s.id,
            name: s.name,
            componentType: s.componentType,
            minQty: Number(s.minQty) || 0,
            maxQty: Number(s.maxQty) || 0,
            sortOrder: i + 1,
          })),
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || "Не получилось сохранить категорию");
        setBusy(false);
        return;
      }
      router.refresh();
      initialRef.current = currentSig;
      setBusy(false);
    } catch {
      setError("Не получилось сохранить категорию");
      setBusy(false);
    }
  };

  return (
    <div className="board board--paper" style={{ padding: "18px 20px" }}>
      <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
        Редактор категории «{name}»
      </h3>

      <div className="field">
        <label>Название</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>ID (URL)</label>
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </div>
      <div className="field">
        <label>Описание</label>
        <textarea
          placeholder="Что показывать в шапке категории"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
            value={workPrice}
            onChange={(e) => setWorkPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Валюта работы</label>
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
        <div className="field">
          <label>База срока, дн</label>
          <input
            type="number"
            value={baseWorkDays}
            onChange={(e) => setBaseWorkDays(e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ display: "flex", gap: "20px" }}>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />{" "}
          Активна
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={hasSlotTemplate}
            onChange={(e) => setHasSlotTemplate(e.target.checked)}
          />{" "}
          Есть шаблон слотов (для конфигуратора)
        </label>
      </div>

      <div
        className="sec-h2"
        style={{ fontSize: "1rem", margin: "22px 0 6px" }}
      >
        Шаблон слотов{" "}
        <span className="chip chip--mustard" style={{ fontSize: ".62rem" }}>
          drag&drop
        </span>
      </div>
      <small className="muted">
        Слоты — «корзины» конфигуратора. Тип определяет, какие комплектующие можно
        положить в слот.
      </small>

      <div className="slot-editor">
        {slots.map((s, i) => (
          <div className="slot is-open" key={s.key}>
            <div className="slot-head">
              ⣿ {s.name}
              <small>
                тип: {s.componentType} · {s.minQty}–{s.maxQty}{" "}
                {plural(s.maxQty, ["позиция", "позиции", "позиций"])} · порядок {i + 1}
              </small>
            </div>
            <div className="slot-body">
              <div className="field--row">
                <div className="field">
                  <label>Название</label>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => patchSlot(s.key, { name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Тип комплектующих</label>
                  <select
                    value={
                      typeOptions.some((o) => o.value === s.componentType)
                        ? s.componentType
                        : ""
                    }
                    onChange={(e) =>
                      patchSlot(s.key, { componentType: e.target.value })
                    }
                  >
                    {!typeOptions.some((o) => o.value === s.componentType) && (
                      <option value="">
                        {s.componentType || "—"} (текущий тип)
                      </option>
                    )}
                    {typeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Min</label>
                  <input
                    type="number"
                    value={s.minQty}
                    onChange={(e) =>
                      patchSlot(s.key, { minQty: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="field">
                  <label>Max</label>
                  <input
                    type="number"
                    value={s.maxQty}
                    onChange={(e) =>
                      patchSlot(s.key, { maxQty: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="btn btn--secondary btn--small"
                  onClick={() => moveSlot(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  className="btn btn--secondary btn--small"
                  onClick={() => moveSlot(i, 1)}
                  disabled={i === slots.length - 1}
                >
                  ↓
                </button>
                <button
                  className="btn btn--secondary btn--small"
                  onClick={() => removeSlot(s.key)}
                >
                  Удалить слот
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ color: "var(--rust)", fontSize: ".8rem", margin: "12px 0 0" }}>
          {error}
        </p>
      )}

      <div className="form-actions" style={{ marginTop: "18px" }}>
          <button className={`btn btn--primary${isDirty ? " is-dirty" : ""}`} onClick={() => void save()} disabled={busy || !isDirty}>
          Сохранить категорию
        </button>
        <button className="btn btn--secondary" onClick={addSlot} disabled={busy}>
          + Добавить слот
        </button>
      </div>
    </div>
  );
}