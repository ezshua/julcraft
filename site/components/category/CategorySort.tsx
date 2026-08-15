"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "new", label: "Сортировка: сначала новинки" },
  { value: "cheap", label: "Сначала дешевле" },
  { value: "expensive", label: "Сначала дороже" },
];

// select сортировки из category.html; меняет URL (?sort=…), остальные параметры сохраняются
export default function CategorySort({ sort }: { sort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="field" style={{ margin: 0, maxWidth: "280px" }}>
      <select
        aria-label="Сортировка"
        value={sort}
        onChange={(e) => onChange(e.target.value)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
