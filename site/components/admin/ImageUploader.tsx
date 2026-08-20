"use client";

import { useRef, useState } from "react";

type Props = {
  kind: "products" | "components";
  /** Лимит из макета: товары — 5 МБ, комплектующие — 2 МБ */
  maxMB: number;
  /** MIME-типы: товары — jpeg/png/webp, комплектующие — png */
  accept: string;
  /** Текст подписи в dropzone (из макета, задаёт родитель) */
  title: string;
  hint: string;
  onUploaded: (path: string) => void;
  children?: React.ReactNode;
};

// Dropzone загрузки изображений — копия div.dropzone из admin-макетов.
// Клик/перетаскивание → POST /api/upload → путь в onUploaded.
export default function ImageUploader({
  kind,
  maxMB,
  accept,
  title,
  hint,
  onUploaded,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
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
      onUploaded(data.path);
    } catch {
      setError("Не получилось загрузить файл");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={drag ? "dropzone is-drag" : "dropzone"}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void upload(e.dataTransfer.files?.[0]);
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="dz-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22242a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      </div>
      <b>{busy ? "Загружаем…" : title}</b>
      <small>{hint}</small>
      {error && (
        <small style={{ color: "var(--rust)", display: "block", marginTop: "6px" }}>
          {error}
        </small>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}