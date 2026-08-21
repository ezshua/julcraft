import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice } from "@/lib/format";
import Crumbs from "@/components/ui/Crumbs";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import CategorySort from "@/components/category/CategorySort";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const cat = db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get();
  if (!cat) return { title: "Каталог — JulCraft" };
  return { title: `${cat.name} — JulCraft` };
}

const PAGE_SIZE = 9;

const AVAIL_FILTERS = [
  { value: "any", label: "Любое наличие" },
  { value: "in", label: "В наличии" },
  { value: "order", label: "Под заказ" },
  { value: "new", label: "Только новинки" },
];

function buildUrl(base: string, params: Record<string, string | undefined>): string {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.set(k, v);
  }
  const qs = url.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function CategoryPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ price?: string; avail?: string; sort?: string; page?: string }>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;

  const cat = db.select().from(categories).where(eq(categories.slug, slug)).get();
  if (!cat) notFound();

  // Границы фильтра цены — из настроек (finance.filterLow/filterHigh, USD-центы, Q-4);
  // метки рендерим в выбранной валюте.
  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const { filterLow, filterHigh } = finance;
  const PRICE_FILTERS = [
    { value: "0", label: "Все" },
    { value: "1", label: `Цена до ${formatPrice(filterLow, currency)}` },
    {
      value: "2",
      label: `${formatPrice(filterLow, currency)} — ${formatPrice(filterHigh, currency)}`,
    },
    { value: "3", label: `От ${formatPrice(filterHigh, currency)}` },
  ];

  const price = ["1", "2", "3"].includes(sp.price ?? "") ? sp.price! : "0";
  const avail = ["in", "order", "new"].includes(sp.avail ?? "") ? sp.avail! : "any";
  const sort = ["cheap", "expensive"].includes(sp.sort ?? "") ? sp.sort! : "new";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Фильтрация (цены в БД — USD-центы)
  const priceCond = (() => {
    switch (price) {
      case "1":
        return lte(products.price, filterLow);
      case "2":
        return and(gte(products.price, filterLow), lte(products.price, filterHigh));
      case "3":
        return gte(products.price, filterHigh);
      default:
        return undefined;
    }
  })();
  const availCond = (() => {
    switch (avail) {
      case "in":
        return eq(products.availability, "in_stock");
      case "order":
        return eq(products.availability, "made_to_order");
      case "new":
        return eq(products.isNew, true);
      default:
        return undefined;
    }
  })();

  const cond = and(
    eq(products.categoryId, cat.id),
    priceCond,
    availCond,
  );

  const orderBy = (() => {
    switch (sort) {
      case "cheap":
        return [asc(products.price), asc(products.id)];
      case "expensive":
        return [desc(products.price), asc(products.id)];
      default:
        return [desc(products.isNew), asc(products.id)];
    }
  })();

  const all = db
    .select()
    .from(products)
    .where(cond)
    .orderBy(...orderBy)
    .all();

  const found = all.length;
  const pages = Math.max(1, Math.ceil(found / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = all.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Параметры для ссылок фильтров/пагинации (без page — он ставится отдельно)
  const baseParams = {
    price: price !== "0" ? price : undefined,
    avail: avail !== "any" ? avail : undefined,
    sort: sort !== "new" ? sort : undefined,
  };
  const pageUrl = (p: number) =>
    buildUrl(`/catalog/${slug}`, {
      ...baseParams,
      page: p > 1 ? String(p) : undefined,
    });

  return (
    <>
      <Crumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: cat.name },
        ]}
      />

      <div className="signboard signboard--small">
        <p className="est">✹ отдел №{cat.sortOrder} ✹</p>
        <h1>{cat.name}</h1>
        <p className="tag">{cat.description}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        {/* Фильтры в панели-борде */}
        <div className="board board--paper mb-30">
          <div className="b-head">
            <h3>Фильтры и сортировка</h3>
            <span className="avail" style={{ color: "var(--olive)" }}>
              найдено: {found}
            </span>
          </div>
          <div className="b-body">
            <div className="filters" style={{ marginBottom: "16px" }}>
              {PRICE_FILTERS.map((f) => (
                <a
                  key={f.value}
                  className={price === f.value ? "filter is-active" : "filter"}
                  href={buildUrl(`/catalog/${slug}`, {
                    ...baseParams,
                    price: f.value !== "0" ? f.value : undefined,
                  })}
                >
                  {f.label}
                </a>
              ))}
            </div>
            <div className="filters" style={{ marginBottom: "16px" }}>
              {AVAIL_FILTERS.map((f) => (
                <a
                  key={f.value}
                  className={avail === f.value ? "filter is-active" : "filter"}
                  href={buildUrl(`/catalog/${slug}`, {
                    ...baseParams,
                    avail: f.value !== "any" ? f.value : undefined,
                  })}
                >
                  {f.label}
                </a>
              ))}
            </div>
            <CategorySort sort={sort} />
          </div>
        </div>

        {found === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="shelf">
              {pageItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {pages > 1 && (
              <div className="pagination">
                {currentPage === 1 ? (
                  <span className="page-btn is-disabled">←</span>
                ) : (
                  <a className="page-btn" href={pageUrl(currentPage - 1)}>
                    ←
                  </a>
                )}
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
                  p === currentPage ? (
                    <span className="page-btn is-active" key={p}>
                      {p}
                    </span>
                  ) : (
                    <a className="page-btn" key={p} href={pageUrl(p)}>
                      {p}
                    </a>
                  ),
                )}
                {currentPage === pages ? (
                  <span className="page-btn is-disabled">→</span>
                ) : (
                  <a className="page-btn" href={pageUrl(currentPage + 1)}>
                    →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <div className="zigzag"></div>
    </>
  );
}
