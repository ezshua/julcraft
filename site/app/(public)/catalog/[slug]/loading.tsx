import SkeletonShelf from "@/components/ui/SkeletonShelf";

// Состояние загрузки категории — скелетон из макета (category.html)
export default function CategoryLoading() {
  return (
    <section className="sect">
      <SkeletonShelf />
    </section>
  );
}
