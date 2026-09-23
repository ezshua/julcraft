import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products, slotTemplates } from "@/drizzle/schema";
import { toLS, L } from "@/lib/localize";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getComponentTypes } from "@/lib/component-types";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import AdminTabs from "@/components/admin/AdminTabs";
import ComponentTypesManager from "@/components/admin/ComponentTypesManager";
import CategoryList from "@/components/admin/CategoryList";
import CategoryEditor from "@/components/admin/CategoryEditor";
import NewCategoryModal from "@/components/admin/NewCategoryModal";
import { AdminDictProvider } from "@/components/admin/admin-dict-context";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: t(dict, "admin.categories.title" as DictionaryKey) };
}

export default async function AdminCategoriesPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const dict = getDictionary(await getLocale());

  const sp = await props.searchParams;

  const locale = await getLocale();
  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const currencyCode = currency.code;

  const allCategories = db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder))
    .all();
  const allProducts = db.select().from(products).all();
  const allSlots = db.select().from(slotTemplates).all();

  // Типы комплектующих (план componentsExt): активные — для выпадающих списков,
  // все — для менеджера на вкладке «Типы комплектующих».
  // ty.name хранится как локализованный JSON; раскрываем под текущую локаль,
  // иначе в селекте слотов отображался сырых {"ru":"...","en":"..."}.
  const allTypes = getComponentTypes();
  const activeTypeOptions = allTypes
    .filter((ty) => ty.isActive)
    .map((ty) => ({ value: ty.code, label: L(ty.name, locale) }));

  const productCount = (categoryId: number) =>
    allProducts.filter((p) => p.categoryId === categoryId).length;

  const listItems = allCategories.map((c) => ({
    id: c.id,
    // Сырая строка из БД — CategoryList раскрывает под локаль админки (L()).
    name: c.name,
    productCount: productCount(c.id),
    workPrice: c.workPrice,
    workPriceCurrency: c.workPriceCurrency,
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
        name: toLS(active.name),
        slug: active.slug,
        description: toLS(active.description),
        image: active.image,
        workPrice: active.workPrice,
        workPriceCurrency: active.workPriceCurrency,
        baseWorkDays: active.baseWorkDays,
        isActive: active.isActive,
        hasSlotTemplate: active.hasSlotTemplate,
        slots: allSlots
          .filter((s) => s.categoryId === active.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({
            id: s.id,
            name: toLS(s.name),
            componentType: s.componentType,
            minQty: s.minQty,
            maxQty: s.maxQty,
          })),
      }
    : null;

  const typesTab = (
    <ComponentTypesManager
      types={allTypes.map((ty) => ({
        id: ty.id,
        code: ty.code,
        name: ty.name,
        sortOrder: ty.sortOrder,
        isActive: ty.isActive,
      }))}
    />
  );

  const categoriesTab = (
    <div className="admin-2col">
      <CategoryList
        categories={listItems}
        finance={finance}
        currencyCode={currencyCode}
        activeId={active?.id}
      />

      {editorCategory ? (
        <CategoryEditor
          key={editorCategory.id}
          category={editorCategory}
          finance={finance}
          currencyCode={currencyCode}
          typeOptions={activeTypeOptions}
        />
      ) : (
        <div className="board board--paper" style={{ padding: "18px 20px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            {dict.admin.categories.editorTitle}
          </h3>
          <small className="muted">{dict.admin.categories.selectCategory}</small>
        </div>
      )}
    </div>
  );

  return (
    <AdminDictProvider dict={dict.admin} locale={locale}>
    <>
      <div className="page-title">
        <h1>{dict.admin.categories.heading}</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">{dict.admin.categories.doodle}</span>
          <NewCategoryModal finance={finance} currencyCode={currencyCode} />
        </div>
      </div>

      <AdminTabs
        firstLabel={dict.admin.categories.tabCategories}
        secondLabel={dict.admin.categories.tabTypes}
        first={categoriesTab}
        second={typesTab}
      />
    </>
    </AdminDictProvider>
  );
}