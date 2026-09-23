"use client";

import { useState } from "react";
import { useAdminDict, useAdminLocale } from "./admin-dict-context";
import { useRouter } from "next/navigation";
import { toLS, L } from "@/lib/localize";
import LocalizedField, { type LocalizedValue } from "./LocalizedField";

export type ComponentTypeItem = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

// d.colCodeы базовых типов сида — дублируют lib/component-types.ts (клиент не
// импортирует server-only модуль): их нельзя удалить, только деактивировать.
const BASE_CODES = new Set(["stone", "pendant", "bead", "cord", "clasp", "base"]);

type Props = {
  types: ComponentTypeItem[];
};

// Управление типами комплектующих (план componentsExt): создание, переименование,
// порядок, d.activeOn/d.activeOff. d.colCode после создания не редактируется (стабильные ссылки);
// удаление — только для неиспользуемых кастомных типов (кнопка 🗑 приходит с
// сервера как DeleteButton, здесь — переключатели и формы).
export default function ComponentTypesManager({ types }: Props) {
  const d = useAdminDict().components;
  const locale = useAdminLocale() ?? "ru";
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState<LocalizedValue>({ ru: "", en: "", uk: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<LocalizedValue>({ ru: "", en: "", uk: "" });
  const [editSortOrder, setEditSortOrder] = useState("0");

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/component-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name,
          sortOrder:
            (types.length
              ? Math.max(...types.map((t) => t.sortOrder))
              : -1) + 1,
          isActive: true,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || d.error);
        setBusy(false);
        return;
      }
      setCode("");
      setName({ ru: "", en: "", uk: "" });
      router.refresh();
    } catch {
      setError(d.error);
    }
    setBusy(false);
  };

  const update = async (
    id: number,
    payload: { name?: LocalizedValue; sortOrder?: number; isActive?: boolean },
  ) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/component-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || d.error);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(d.error);
      return false;
    }
  };

  const remove = async (t: ComponentTypeItem) => {
    if (!confirm(d.confirmDelete.replace("{name}", L(t.name, locale)))) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/component-types/${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || d.error);
        return;
      }
      router.refresh();
    } catch {
      setError(d.error);
    }
  };

  const startEdit = (t: ComponentTypeItem) => {
    setEditingId(t.id);
    setEditName(toLS(t.name));
    setEditSortOrder(String(t.sortOrder));
  };

  const saveEdit = async (id: number) => {
    const ok = await update(id, {
      name: editName && editName.ru.trim() ? editName : undefined,
      sortOrder: Number(editSortOrder) || 0,
    });
    if (ok) setEditingId(null);
  };

  const move = async (t: ComponentTypeItem, dir: -1 | 1) => {
    const sorted = [...types].sort((a, b) =>
      a.sortOrder === b.sortOrder ? a.id - b.id : a.sortOrder - b.sortOrder,
    );
    const idx = sorted.findIndex((x) => x.id === t.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      update(t.id, { sortOrder: target.sortOrder }),
      update(target.id, { sortOrder: t.sortOrder }),
    ]);
  };

  const toggleActive = (t: ComponentTypeItem) =>
    update(t.id, { isActive: !t.isActive });

  return (
    <div className="board board--paper" style={{ padding: "18px 20px" }}>
      <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "6px" }}>
        {d.newTypeTitle}
      </h3>
      <small className="muted">
        {d.typesHint}
      </small>

      <table className="tbl" style={{ marginTop: "14px" }}>
        <thead>
          <tr>
            <th>{d.colCode}</th>
            <th>{d.colName}</th>
            <th>{d.colSortOrder}</th>
            <th>{d.colActive}</th>
            <th>{d.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id}>
              <td>
                <code>{t.code}</code>
              </td>
              <td>
                {editingId === t.id ? (
                  <LocalizedField
                    value={editName}
                    onChange={setEditName}
                    label={d.colName}
                  />
                ) : (
                  L(t.name, locale)
                )}
              </td>
              <td style={{ width: 90 }}>
                {editingId === t.id ? (
                  <input
                    type="number"
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(e.target.value)}
                    style={{ width: 70 }}
                  />
                ) : (
                  t.sortOrder
                )}
              </td>
              <td>
                <button
                  className={t.isActive ? "tag tag--order" : "tag tag--none"}
                  title={
                    t.isActive ? d.activeOffLabel : d.activeOnLabel
                  }
                  onClick={() => void toggleActive(t)}
                >
                  {t.isActive ? d.activeOn : d.activeOff}
                </button>
              </td>
              <td>
                <div className="actions">
                  {editingId === t.id ? (
                    <>
                      <button
                        className="btn btn--primary btn--small"
                        onClick={() => void saveEdit(t.id)}
                      >
                        {d.save}
                      </button>
                      <button
                        className="btn btn--small"
                        onClick={() => setEditingId(null)}
                      >
                        {d.cancel}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32 }}
                        title={d.moveUp}
                        onClick={() => void move(t, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32 }}
                        title={d.moveDown}
                        onClick={() => void move(t, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32 }}
                        title={d.rename}
                        onClick={() => startEdit(t)}
                      >
                        ✎
                      </button>
                      {!BASE_CODES.has(t.code) && (
                        <button
                          className="icon-btn icon-btn--rust"
                          style={{ width: 32, height: 32 }}
                          title={d.deleteTitle}
                          onClick={() => void remove(t)}
                        >
                          🗑
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        className="field--row"
        style={{ marginTop: "16px", alignItems: "center", gap: "12px" }}
      >
        <div className="field">
          <label>{d.newCodeLabel}</label>
          <input
            type="text"
            placeholder={d.newCodePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{d.colName}</label>
          <input
            type="text"
            placeholder={d.newNamePlaceholder}
            value={name.ru}
            onChange={(e) => setName({ ...name, ru: e.target.value })}
          />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button
            className="btn btn--primary btn--small"
            disabled={busy || !code.trim() || !name.ru.trim()}
            onClick={() => void create()}
          >
            {d.addType}
          </button>
        </div>
      </div>
      {error && (
        <p style={{ color: "var(--rust, #b4552d)", marginTop: "10px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
