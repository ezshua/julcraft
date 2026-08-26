import SkeletonShelf from "@/components/ui/SkeletonShelf";

// Состояние загрузки страницы категории конфигуратора — скелетон полки
// (без konva-канваса: он появляется на клиенте)
export default function ConfiguratorCategoryLoading() {
  return (
    <section className="sect">
      <SkeletonShelf />
    </section>
  );
}
