"use client";

import { useRef, useState } from "react";

type Props = {
  kind: "products" | "components" | "categories";
  /** Limit from the mockup: products — 5 MB, components — 2 MB */
  maxMB: number;
  /** MIME types: products — jpeg/png/webp, components — png */
  accept: string;
  /** Dropzone label text (from the mockup, set by the parent) */
  title: string;
  hint: string;
  onUploaded: (path: string) => void;
  /** Dictionary slice for dropzone errors (products / components) */
  dict: { photoTooBig: string; photoError: string; photoUploading: string };
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
  dict,
  children,
}: Props) {
  const d = dict;
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    if (file.size > maxMB * 1024 * 1024) {
      setError(d.photoTooBig.replace("{mb}", String(maxMB)));
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
        setError(text || d.photoError);
        return;
      }
      const data = JSON.parse(text) as { path: string };
      onUploaded(data.path);
    } catch {
      setError(d.photoError);
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
      <b>{busy ? d.photoUploading : title}</b>
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