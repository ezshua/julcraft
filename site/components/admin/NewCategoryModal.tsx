"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Модалка «Новая категория» — копия div.modal-overlay#modal-cat из mockup/admin/categories.html.
export default function NewCategoryModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [workPrice, setWorkPrice] = useState("500");
  const [baseWorkDays, setBaseWorkDays] = useState("3");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
          workPrice: Number(workPrice),
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
      <button className="btn btn--primary btn--small" onClick={() => setOpen(true)}>
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
          <div className="field--row">
            <div className="field">
              <label>Работа мастера, ₽</label>
              <input
                type="number"
                placeholder="500"
                value={workPrice}
                onChange={(e) => setWorkPrice(e.target.value)}
              />
            </div>
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