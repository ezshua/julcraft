"use client";

import { buildSimilarConfiguratorHref } from "@/lib/product-image";
import type { Product } from "@/drizzle/schema";
import type { Dictionary } from "@/lib/dictionaries/ru";
import { useProductSelection } from "./ProductSelectionProvider";

export default function BuildSimilarLink({
  categorySlug,
  product,
  label,
}: {
  categorySlug: string;
  product: Pick<Product, "slug">;
  label: Dictionary["product"]["buildSimilar"];
}) {
  const { image } = useProductSelection();
  return (
    <a
      className="btn btn--secondary"
      href={buildSimilarConfiguratorHref(categorySlug, product.slug, image)}
    >
      {label}
    </a>
  );
}
