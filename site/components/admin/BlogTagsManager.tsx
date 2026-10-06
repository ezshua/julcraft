"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminDict, useAdminLocale } from "./admin-dict-context";
import { toLS, L } from "@/lib/localize";
import { slugify } from "@/lib/format";
import LocalizedField, { type LocalizedValue } from "./LocalizedField";

export type BlogTagItem = {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  postCount: number;
};

// Вкладка «Рубрики» страницы блога (mockup/admin/blog.html): создание,
// переименование, порядок, показ в фильтре витрины, удаление.
// Название локализовано, slug — стабильный идентификатор (D-B6): он
// подставляется из названия, пока мастер не правил его руками.
export default function BlogTagsManager({ tags }: { tags: BlogTagItem[] }) {
  const d = useAdminDict().blog;
  const locale = useAdminLocale() ?? "ru";
  const router = useRouter();

  const [name, setName] = useState<LocalizedValue>({ ru: "", en: "", uk: "" });
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<LocalizedValue>({ ru: "", en: "", uk: "" });
  const [editSortOrder, setEditSortOrder] = useState("0");

  const request = async (url: string, method: string, payload?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    return res;
  };

  const showError = async (res: Response) => {
    const text = await res.text();
    setError(text || d.error);
  };

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await request("/api/admin/blog/tags", "POST", {
        name,
        slug: slugTouched ? slug : slugify(name.ru),
        sortOrder: (tags.length ? Math.max(...tags.map((t) => t.sortOrder)) : -1) + 1,
        isActive: true,
      });
      if (!res.ok) {
        await showError(res);
        return;
      }
      setName({ ru: "", en: "", uk: "" });
      setSlug("");
      setSlugTouched(false);
      router.refresh();
    } catch {
      setError(d.errorCreate);
    } finally {
      setBusy(false);
    }
  };

  const update = async (
    id: number,
    payload: { name?: LocalizedValue; sortOrder?: number; isActive?: boolean },
  ) => {
    setError("");
    try {
      const res = await request(`/api/admin/blog/tags/${id}`, "PUT", payload);
      if (!res.ok) {
        await showError(res);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(d.error);
      return false;
    }
  };

  const remove = async (tag: BlogTagItem) => {
    if (!confirm(d.confirmDeleteTag.replace("{name}", L(tag.name, locale)))) return;
    setError("");
    try {
      const res = await request(`/api/admin/blog/tags/${tag.id}`, "DELETE");
      if (!res.ok) {
        await showError(res);
        return;
      }
      router.refresh();
    } catch {
      setError(d.errorDelete);
    }
  };

  const startEdit = (tag: BlogTagItem) => {
    setEditingId(tag.id);
    setEditName(toLS(tag.name));
    setEditSortOrder(String(tag.sortOrder));
  };

  const saveEdit = async (id: number) => {
    const ok = await update(id, {
      name: editName && editName.ru.trim() ? editName : undefined,
      sortOrder: Number(editSortOrder) || 0,
    });
    if (ok) setEditingId(null);
  };

  const move = async (tag: BlogTagItem, dir: -1 | 1) => {
    const sorted = [...tags].sort((a, b) =>
      a.sortOrder === b.sortOrder ? a.id - b.id : a.sortOrder - b.sortOrder,
    );
    const idx = sorted.findIndex((x) => x.id === tag.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      update(tag.id, { sortOrder: target.sortOrder }),
      update(target.id, { sortOrder: tag.sortOrder }),
    ]);
  };

  const toggleActive = (tag: BlogTagItem) => update(tag.id, { isActive: !tag.isActive });

  return (
    <div>
      <div className="board">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{d.colTagName}</th>
                <th>{d.colPostCount}</th>
                <th>{d.colInFilter}</th>
                <th>{d.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td className="cell-name">
                    {editingId === tag.id ? (
                      <LocalizedField value={editName} onChange={setEditName} label={d.colTagName} compact />
                    ) : (
                      <>
                        <b>{L(tag.name, locale)}</b>
                        <small>{tag.slug}</small>
                      </>
                    )}
                  </td>
                  <td className="num">{tag.postCount}</td>
                  <td>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={tag.isActive}
                        onChange={() => void toggleActive(tag)}
                      />{" "}
                      {d.showInFilter}
                    </label>
                  </td>
                  <td>
                    <div className="actions">
                      {editingId === tag.id ? (
                        <>
                          <div className="field" style={{ margin: 0 }}>
                            <input
                              type="number"
                              aria-label={d.colSortOrder}
                              value={editSortOrder}
                              onChange={(e) => setEditSortOrder(e.target.value)}
                              style={{ width: 70 }}
                            />
                          </div>
                          <button
                            className="btn btn--primary btn--small"
                            onClick={() => void saveEdit(tag.id)}
                          >
                            {d.save}
                          </button>
                          <button className="btn btn--small" onClick={() => setEditingId(null)}>
                            {d.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-btn"
                            style={{ width: 32, height: 32 }}
                            title={d.moveUp}
                            onClick={() => void move(tag, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="icon-btn"
                            style={{ width: 32, height: 32 }}
                            title={d.moveDown}
                            onClick={() => void move(tag, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className="icon-btn"
                            style={{ width: 32, height: 32 }}
                            title={d.rename}
                            onClick={() => startEdit(tag)}
                          >
                            ✎
                          </button>
                          <button
                            className="icon-btn icon-btn--rust"
                            style={{ width: 32, height: 32 }}
                            title={d.deleteTitle}
                            onClick={() => void remove(tag)}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tags.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>
                    {d.nothingFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="board board--paper mt-20">
        <div className="form-card" style={{ boxShadow: "none" }}>
          <h3>{d.newTagTitle}</h3>
          <div className="field--row">
            <LocalizedField
              value={name}
              onChange={(next) => {
                setName(next);
                if (!slugTouched) setSlug(slugify(next.ru));
              }}
              label={d.tagNameLabel}
              placeholder={d.tagNamePlaceholder}
            />
            <div className="field">
              <label>{d.tagSlugLabel}</label>
              <input
                type="text"
                placeholder={d.tagSlugPlaceholder}
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn--primary"
              disabled={busy || !name.ru.trim() || !slug.trim()}
              onClick={() => void create()}
            >
              {d.addTag}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--rust)", marginTop: "10px" }}>{error}</p>
      )}
    </div>
  );
}
