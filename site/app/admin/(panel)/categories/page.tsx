import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products, slotTemplates } from "@/drizzle/schema";
import CategoryList from "@/components/admin/CategoryList";
import CategoryEditor from "@/components/admin/CategoryEditor";
import NewCategoryModal from "@/components/admin/NewCategoryModal";

export const metadata: Metadata = {
  title: "Категории — JulCraft Админ",
};

export default async function AdminCategoriesPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await props.searchParams;

  const allCategories = db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder))
    .all();
  const allProducts = db.select().from(products).all();
  const allSlots = db.select().from(slotTemplates).all();

  const productCount = (categoryId: number) =>
    allProducts.filter((p) => p.categoryId === categoryId).length;

  const listItems = allCategories.map((c) => ({
    id: c.id,
    name: c.name,
    productCount: productCount(c.id),
    workPrice: c.workPrice,
    baseWorkDays: c.baseWorkDays,
    hasSlotTemplate: c.hasSlotTemplate,
  }));

  const requestedId =
    sp.id && Number.isInteger(Number(sp.id)) ? Number(sp.id) : 0;
  const active =
    allCategories.find((c) => c.id === requestedId) ?? allCategories[0];

  const editorCategory = active
    ? {
        id: active.id,
        name: active.name,
        slug: active.slug,
        description: active.description,
        workPrice: active.workPrice,
        baseWorkDays: active.baseWorkDays,
        isActive: active.isActive,
        hasSlotTemplate: active.hasSlotTemplate,
        slots: allSlots
          .filter((s) => s.categoryId === active.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({
            id: s.id,
            name: s.name,
            componentType: s.componentType,
            minQty: s.minQty,
            maxQty: s.maxQty,
          })),
      }
    : null;

  return (
    <>
      <div className="page-title">
        <h1>Категории и слоты</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">порядок = drag&drop</span>
          <NewCategoryModal />
        </div>
      </div>

      <div className="admin-2col">
        <CategoryList categories={listItems} />

        {editorCategory ? (
          <CategoryEditor key={editorCategory.id} category={editorCategory} />
        ) : (
          <div className="board board--paper" style={{ padding: "18px 20px" }}>
            <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
              Редактор категории
            </h3>
            <small className="muted">Выберите категорию слева</small>
          </div>
        )}
      </div>
    </>
  );
}