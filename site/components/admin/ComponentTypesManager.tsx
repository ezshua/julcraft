"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ComponentTypeItem = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

// Коды базовых типов сида — дублируют lib/component-types.ts (клиент не
// импортирует server-only модуль): их нельзя удалить, только деактивировать.
const BASE_CODES = new Set(["stone", "pendant", "bead", "cord", "clasp", "base"]);

type Props = {
  types: ComponentTypeItem[];
};

// Управление типами комплектующих (план componentsExt): создание, переименование,
// порядок, вкл/выкл. Код после создания не редактируется (стабильные ссылки);
// удаление — только для неиспользуемых кастомных типов (кнопка 🗑 приходит с
// сервера как DeleteButton, здесь — переключатели и формы).
export default function ComponentTypesManager({ types }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
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
          name: name.trim(),
          sortOrder:
            (types.length
              ? Math.max(...types.map((t) => t.sortOrder))
              : -1) + 1,
          isActive: true,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || "Не получилось создать тип");
        setBusy(false);
        return;
      }
      setCode("");
      setName("");
      router.refresh();
    } catch {
      setError("Не получилось создать тип");
    }
    setBusy(false);
  };

  const update = async (
    id: number,
    payload: { name?: string; sortOrder?: number; isActive?: boolean },
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
        setError(text || "Не получилось сохранить тип");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Не получилось сохранить тип");
      return false;
    }
  };

  const remove = async (t: ComponentTypeItem) => {
    if (!confirm(`Удалить тип «${t.name}»?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/component-types/${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Не получилось удалить тип");
        return;
      }
      router.refresh();
    } catch {
      setError("Не получилось удалить тип");
    }
  };

  const startEdit = (t: ComponentTypeItem) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditSortOrder(String(t.sortOrder));
  };

  const saveEdit = async (id: number) => {
    const ok = await update(id, {
      name: editName.trim() || "Без названия",
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
        Типы комплектующих
      </h3>
      <small className="muted">
        Код используется в данных и не меняется; название и порядок можно править.
      </small>

      <table className="tbl" style={{ marginTop: "14px" }}>
        <thead>
          <tr>
            <th>Код</th>
            <th>Название</th>
            <th>Порядок</th>
            <th>Включён</th>
            <th>Действия</th>
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
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  t.name
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
                    t.isActive ? "Выключить (скрыть из списков)" : "Включить"
                  }
                  onClick={() => void toggleActive(t)}
                >
                  {t.isActive ? "вкл" : "выкл"}
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
                        Сохранить
                      </button>
                      <button
                        className="btn btn--small"
                        onClick={() => setEditingId(null)}
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32 }}
                        title="Порядок выше"
                        onClick={() => void move(t, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32 }}
                        title="Порядок ниже"
                        onClick={() => void move(t, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32 }}
                        title="Переименовать"
                        onClick={() => startEdit(t)}
                      >
                        ✎
                      </button>
                      {!BASE_CODES.has(t.code) && (
                        <button
                          className="icon-btn icon-btn--rust"
                          style={{ width: 32, height: 32 }}
                          title="Удалить"
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
          <label>Новый код (латиница/дефис)</label>
          <input
            type="text"
            placeholder="напр. wire-guard"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Название</label>
          <input
            type="text"
            placeholder="напр. Оплетка провода"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button
            className="btn btn--primary btn--small"
            disabled={busy || !code.trim() || !name.trim()}
            onClick={() => void create()}
          >
            + Добавить тип
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
