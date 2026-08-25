"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, asPriced, plural } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import type { FinanceSettings } from "@/lib/currency";

export type CategoryListItem = {
  id: number;
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
};

// Левая панель: категории с drag&drop (Решение 5б). Клик по строке — открыть в редакторе.
export default function CategoryList({ categories, finance, currencyCode }: Props) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [items, setItems] = useState(categories);

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
        Категории
        <span className="chip chip--mustard">drag&drop</span>
      </h3>
      <div className="slot-editor">
        {items.map((c, i) => (
          <div
            className="slot is-open"
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
              style={{ cursor: "pointer" }}
              onClick={() => router.push(`/admin/categories?id=${c.id}`)}
            >
              <span className="slot-title">⣿ {c.name}</span>
              <small>
                {c.hasSlotTemplate
                   ? `${plural(c.productCount, ["изделие", "изделия", "изделий"])} ${c.productCount} · работа ${formatPrice(asPriced(c.workPrice, c.workPriceCurrency), currency, finance)} · ${c.baseWorkDays} дн`
                   : "без шаблона слотов"}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}