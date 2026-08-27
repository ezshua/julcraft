"use client";

import { useRef, useState } from "react";

type Props = {
  images: string[];
  onChange: (next: string[]) => void;
  kind: "products" | "components";
  /** Лимит размера файла, МБ */
  maxMB: number;
  /** MIME-типы через запятую */
  accept: string;
  /** Подсказка под сеткой */
  hint: string;
};

const MAX = 6;

// Сетка фото (до 6 ячеек) во вкладке «Фото» карточки товара.
// Зона разбита на 6 равных ячеек: заполненная показывает крупное фото
// с кнопкой удаления, пустая — пунктирный слот «+», в который можно
// кликнуть или перетащить файл. Первая ячейка помечена «обложка».
// Заполненные ячейки можно перетаскивать друг на друга для смены порядка.
export default function PhotoGrid({ images, onChange, kind, maxMB, accept, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const targetIndex = useRef<number>(images.length);
  const [overCell, setOverCell] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const uploadAt = async (file: File | undefined, index: number) => {
    if (!file || busy) return;
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Файл больше ${maxMB} МБ`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) {
        setError(text || "Не получилось загрузить файл");
        return;
      }
      const data = JSON.parse(text) as { path: string };
      const next = [...images];
      next.splice(Math.min(index, next.length), 0, data.path);
      if (next.length > MAX) {
        setError(`Максимум ${MAX} фото`);
        return;
      }
      onChange(next);
    } catch {
      setError("Не получилось загрузить файл");
    } finally {
      setBusy(false);
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const openPicker = (index: number) => {
    if (busy || images.length >= MAX) return;
    targetIndex.current = index;
    inputRef.current?.click();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = targetIndex.current;
    targetIndex.current = images.length;
    void uploadAt(file, index);
    e.target.value = "";
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, i: number) => {
    e.dataTransfer.setData("text/plain", String(i));
    e.dataTransfer.effectAllowed = "move";
    setDragging(i);
  };

  const onDragEnd = () => {
    setDragging(null);
    setOverCell(null);
  };

  return (
    <div>
      <div className="photo-grid">
        {Array.from({ length: MAX }).map((_, i) => {
          const img = images[i];
          const filled = Boolean(img);
          const cls = [
            "cell",
            filled ? "is-filled" : "",
            overCell === i ? "is-drop-target" : "",
            dragging === i ? "is-dragging" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={i}
              className={cls}
              draggable={filled}
              onClick={() => !filled && openPicker(i)}
              onDragStart={filled ? (e) => onDragStart(e, i) : undefined}
              onDragEnd={filled ? onDragEnd : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCell(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOverCell(null);
                // Сначала проверяем внутренний маркер перетаскивания:
                // браузер при драге <img> сам кладёт картинку в files,
                // поэтому без этой проверки реордер трактуется как загрузка.
                const fromRaw = e.dataTransfer.getData("text/plain");
                const from = Number(fromRaw);
                if (fromRaw !== "" && !Number.isNaN(from) && from >= 0 && from !== i) {
                  reorder(from, i);
                  return;
                }
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  void uploadAt(file, i);
                  return;
                }
              }}
            >
              {filled ? (
                <>
                  {i === 0 && <span className="cover-tag">обложка</span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" />
                  <button
                    className="icon-btn"
                    style={{
                      position: "absolute",
                      bottom: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      fontSize: ".7rem",
                      borderWidth: 2,
                    }}
                    title="Удалить фото"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(images.filter((_, j) => j !== i));
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="plus">+</span>
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={onPick}
      />
      <div className="grid-hint">
        {hint} · загружено {images.length} из {MAX}
      </div>
      {busy && <div className="grid-hint">Загружаем…</div>}
      {error && <div className="grid-error">{error}</div>}
    </div>
  );
}
