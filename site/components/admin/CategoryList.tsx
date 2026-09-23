"use client";

import { useRef, useState } from "react";
import { useAdminDict, useAdminLocale } from "./admin-dict-context";
import { useRouter } from "next/navigation";
import { formatPrice, asPriced, plural } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import { L } from "@/lib/localize";
import type { FinanceSettings } from "@/lib/currency";
import DeleteButton from "./DeleteButton";

export type CategoryListItem = {
  id: number;
  // Сырая строка из БД (локализованный JSON), раскрывается под локаль админки.
  name: string;
  productCount: number;
  workPrice: number;
  workPriceCurrency: string;
  baseWorkDays: number;
  hasSlotTemplate: boolean;
};

type Props = {
  categories: CategoryListItem[];
  finance: FinanceSettings;
  currencyCode: string;
  activeId?: number;
};

// Левая панель: категории с drag&drop (Решение 5б). Клик по строке — открыть в редакторе.
export default function CategoryList({ categories, finance, currencyCode, activeId }: Props) {
  const d = useAdminDict().categories;
  const locale = useAdminLocale() ?? "ru";
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [items, setItems] = useState(categories);

  // Список приходит из сервера (server component). router.refresh() после
  // создания/переупорядокивания категорий меняет пропс — синхронизируем state
  // в рендере (официальный React-паттерн "adjusting state on prop change"):
  // setState во время рендера безопасен, React перерендерит без цикла.
  const prevRef = useRef(categories);
  if (prevRef.current !== categories) {
    prevRef.current = categories;
    setItems(categories);
  }

  const move = async (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);

    try {
      await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((c, i) => ({ id: c.id, sortOrder: i + 1 })),
        }),
      });
    } catch {
      // порядок вернётся при следующем рефреше
    }
    router.refresh();
  };

  return (
    <div className="board board--paper">
      <h3 className="sec-h2">
        {d.heading}
        <span className="chip chip--mustard">{d.listChip}</span>
      </h3>
      <div className="slot-editor">
        {items.map((c, i) => (
          <div
            className={`slot is-open${c.id === activeId ? " is-active" : ""}`}
            key={c.id}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDragEnd={() => setDragIndex(null)}
            onDrop={() => {
              if (dragIndex != null) void move(dragIndex, i);
              setDragIndex(null);
            }}
          >
            <div
              className="slot-head slot-head--stacked"
              style={{ cursor: "pointer", position: "relative" }}
              onClick={() => router.push(`/admin/categories?id=${c.id}`)}
            >
              <span className="slot-title">⣿ {L(c.name, locale)}</span>
              <small>
                {c.hasSlotTemplate
                   ? `${plural(c.productCount, [d.productItem, d.productItems, d.productItemsMany])} ${c.productCount} · ${d.workPriceLabel} ${formatPrice(asPriced(c.workPrice, c.workPriceCurrency), currency, finance)} · ${c.baseWorkDays} ${d.daysShort}`
                   : d.noSlots}
              </small>
              <div
                style={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <DeleteButton
                  url={`/api/admin/categories/${c.id}`}
                  confirmText={d.deleteCategory.replace("{name}", L(c.name, locale))}
                  icon="✕"
                  dict={{ deleteTitle: d.deleteCategoryTitle, deleteFailed: d.deleteCategoryFailed }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}