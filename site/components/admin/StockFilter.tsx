"use client";

import { useRouter } from "next/navigation";
import { useAdminDict } from "./admin-dict-context";

type Props = {
  value: string;
  baseParams: Record<string, string | undefined>;
};

// Select «Остаток: любые» — переход по ?st= (остальные фильтры сохраняются).
export default function StockFilter({ value, baseParams }: Props) {
  const d = useAdminDict().components;
  const router = useRouter();

  return (
    <div className="field" style={{ margin: 0, minWidth: 220 }}>
      <select
        aria-label={d.labelStock}
        value={value}
        onChange={(e) => {
          const url = new URLSearchParams();
          for (const [k, v] of Object.entries(baseParams)) {
            if (v !== undefined && v !== "") url.set(k, v);
          }
          if (e.target.value !== "any") url.set("st", e.target.value);
          router.push(`/admin/components${url.toString() ? `?${url.toString()}` : ""}`);
        }}
      >
        <option value="any">{d.filterAny}</option>
        <option value="in">{d.filterIn}</option>
        <option value="zero">{d.filterZero}</option>
      </select>
    </div>
  );
}