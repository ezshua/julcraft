import SkeletonShelf from "@/components/ui/SkeletonShelf";

// Состояние загрузки каталога — скелетон полки (как в category.html)
export default function CatalogLoading() {
  return (
    <section className="sect">
      <SkeletonShelf />
    </section>
  );
}
