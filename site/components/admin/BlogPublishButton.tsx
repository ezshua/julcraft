"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogPostStatus } from "@/drizzle/schema";

type Props = {
  postId: number;
  status: BlogPostStatus;
  dict: {
    publish: string;
    unpublish: string;
    publishTitle: string;
    unpublishTitle: string;
    error: string;
  };
};

// Кнопка «Опубликовать» / «Снять с публикации» в списке записей.
// Отдельный POST /publish (D-B14): сервер сам решает, что дата публикации
// ставится один раз и не перетирается при повторном нажатии.
export default function BlogPublishButton({ postId, status, dict }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const published = status === "published";
  const d = dict;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/blog/${postId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: published ? "unpublish" : "publish" }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || d.error);
        return;
      }
      router.refresh();
    } catch {
      setError(d.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="btn btn--small"
        title={published ? d.unpublishTitle : d.publishTitle}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {published ? d.unpublish : d.publish}
      </button>
      {error && (
        <span style={{ color: "var(--rust)", fontSize: "0.7rem" }}>{error}</span>
      )}
    </>
  );
}
