"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries/ru";

type CategorySortProps = {
  sort: string;
  labels: Dictionary["catalog"]["sort"];
};

// select сортировки из category.html; меняет URL (?sort=…), остальные параметры сохраняются
export default function CategorySort({ sort, labels }: CategorySortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const OPTIONS = [
    { value: "new", label: labels.newest },
    { value: "cheap", label: labels.cheap },
    { value: "expensive", label: labels.expensive },
  ];

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="field" style={{ margin: 0, maxWidth: "280px" }}>
      <select
        aria-label={labels.ariaLabel}
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
