import SkeletonShelf from "@/components/ui/SkeletonShelf";

// Состояние загрузки админских таблиц — скелетон полки
export default function AdminTableLoading() {
  return (
    <section className="sect">
      <SkeletonShelf />
    </section>
  );
}
