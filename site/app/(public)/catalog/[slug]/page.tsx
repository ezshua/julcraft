import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, asPriced, toUsdAmount } from "@/lib/format";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import Crumbs from "@/components/ui/Crumbs";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import CategorySort from "@/components/category/CategorySort";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const cat = db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get();
  if (!cat) return { title: t(dict, "meta.catalog.title") };

  // OG-картинка — фото первого товара категории (если есть)
  const first = db
    .select()
    .from(products)
    .where(eq(products.categoryId, cat.id))
    .get();

  return {
    title: t(dict, "meta.catalogCategory.title", { name: cat.name }),
    description: cat.description,
    alternates: { canonical: `/catalog/${cat.slug}` },
    openGraph: {
      title: t(dict, "meta.catalogCategory.title", { name: cat.name }),
      description: cat.description,
      type: "website",
      images: first?.images[0] ? [{ url: first.images[0] }] : undefined,
    },
  };
}

const PAGE_SIZE = 9;

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

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const catalog = dict.catalog;

  // Границы фильтра цены — из настроек как Priced (минора + валюта, D-23b);
  // метки и сравнение — через их валюту, сравниваем в USD.
  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const { filterLow, filterLowCurrency, filterHigh, filterHighCurrency } = finance;
  const usdFilterLow = toUsdAmount(asPriced(filterLow, filterLowCurrency), finance) * 100;
  const usdFilterHigh = toUsdAmount(asPriced(filterHigh, filterHighCurrency), finance) * 100;
  const PRICE_FILTERS = [
    { value: "0", label: catalog.priceAll },
    {
      value: "1",
      label: t(dict, "catalog.priceUpTo", {
        price: formatPrice(asPriced(filterLow, filterLowCurrency), currency, finance),
      }),
    },
    {
      value: "2",
      label: t(dict, "catalog.priceRange", {
        from: formatPrice(asPriced(filterLow, filterLowCurrency), currency, finance),
        to: formatPrice(asPriced(filterHigh, filterHighCurrency), currency, finance),
      }),
    },
    {
      value: "3",
      label: t(dict, "catalog.priceFrom", {
        price: formatPrice(asPriced(filterHigh, filterHighCurrency), currency, finance),
      }),
    },
  ];

  const price = ["1", "2", "3"].includes(sp.price ?? "") ? sp.price! : "0";
  const avail = ["in", "order", "new"].includes(sp.avail ?? "") ? sp.avail! : "any";
  const sort = ["cheap", "expensive"].includes(sp.sort ?? "") ? sp.sort! : "new";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const AVAIL_FILTERS = [
    { value: "any", label: catalog.avail.any },
    { value: "in", label: catalog.avail.in },
    { value: "order", label: catalog.avail.order },
    { value: "new", label: catalog.avail.new },
  ];

  // Фильтрация/сортировка: наличие — в SQL, цена — в памяти (валюты разные,
  // сравнение через USD, D-28). Границы фильтра — Priced, сводим к USD для сравнения.
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

  const cond = and(eq(products.categoryId, cat.id), availCond);

  const priceUsdCents = (p: (typeof products.$inferSelect)): number =>
    toUsdAmount(asPriced(p.price, p.priceCurrency), finance) * 100;

  let all = db.select().from(products).where(cond).all();

  if (price === "1") all = all.filter((p) => priceUsdCents(p) <= usdFilterLow);
  else if (price === "2")
    all = all.filter(
      (p) => priceUsdCents(p) >= usdFilterLow && priceUsdCents(p) <= usdFilterHigh,
    );
  else if (price === "3") all = all.filter((p) => priceUsdCents(p) >= usdFilterHigh);

  if (sort === "cheap")
    all = [...all].sort((a, b) => priceUsdCents(a) - priceUsdCents(b) || a.id - b.id);
  else if (sort === "expensive")
    all = [...all].sort((a, b) => priceUsdCents(b) - priceUsdCents(a) || a.id - b.id);
  else all = [...all].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.id - b.id);

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
          { label: catalog.crumbsHome, href: "/" },
          { label: catalog.crumbsCatalog, href: "/catalog" },
          { label: cat.name },
        ]}
      />

      <div className="signboard signboard--small">
        <p className="est">{t(dict, "catalog.shelfEst", { n: cat.sortOrder })}</p>
        <h1>{cat.name}</h1>
        <p className="tagline">{cat.description}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        {/* Фильтры в панели-борде */}
        <div className="board board--paper mb-30">
          <div className="b-head">
            <h3>{catalog.filtersTitle}</h3>
            <span className="avail" style={{ color: "var(--olive)" }}>
              {t(dict, "catalog.found", { n: found })}
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
            <CategorySort sort={sort} labels={catalog.sort} />
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
