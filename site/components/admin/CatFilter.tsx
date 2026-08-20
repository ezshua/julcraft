"use client";

import { useRouter } from "next/navigation";

type Props = {
  categories: { id: number; name: string }[];
  value: number;
  baseParams: Record<string, string | undefined>;
};

// Select «Категория: все» — переход по ?cat= (остальные фильтры сохраняются).
export default function CatFilter({ categories, value, baseParams }: Props) {
  const router = useRouter();

  return (
    <div className="field" style={{ margin: 0, minWidth: 220 }}>
      <select
        aria-label="Категория"
        value={value}
        onChange={(e) => {
          const url = new URLSearchParams();
          for (const [k, v] of Object.entries(baseParams)) {
            if (v !== undefined && v !== "") url.set(k, v);
          }
          if (e.target.value) url.set("cat", e.target.value);
          router.push(`/admin/products${url.toString() ? `?${url.toString()}` : ""}`);
        }}
      >
        <option value="">Категория: все</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}