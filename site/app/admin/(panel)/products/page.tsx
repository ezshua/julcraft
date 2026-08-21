import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, asPriced } from "@/lib/format";
import ProductModal from "@/components/admin/ProductModal";
import DeleteButton from "@/components/admin/DeleteButton";
import CatFilter from "@/components/admin/CatFilter";

export const metadata: Metadata = {
  title: "Товары — JulCraft Админ",
};

const PAGE_SIZE = 12;

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новинки" },
  { value: "feat", label: "Избранное" },
  { value: "stock", label: "В наличии" },
  { value: "order", label: "Под заказ" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function buildUrl(params: Record<string, string | undefined>): string {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.set(k, v);
  }
  const qs = url.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export default async function AdminProductsPage(props: {
  searchParams: Promise<{ f?: string; cat?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const currencyCode = currency.code;

  const f: FilterValue = FILTERS.some((x) => x.value === sp.f)
    ? (sp.f as FilterValue)
    : "all";
  const catId = sp.cat && Number.isInteger(Number(sp.cat)) ? Number(sp.cat) : 0;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const allCats = db.select().from(categories).orderBy(asc(categories.sortOrder)).all();
  const allProducts = db.select().from(products).all();

  const countFor = (filter: FilterValue, cid: number) =>
    allProducts.filter((p) => {
      if (cid && p.categoryId !== cid) return false;
      switch (filter) {
        case "new":
          return p.isNew;
        case "feat":
          return p.isFeatured;
        case "stock":
          return p.availability === "in_stock";
        case "order":
          return p.availability === "made_to_order";
        default:
          return true;
      }
    }).length;

  const match = (p: (typeof allProducts)[number]) => {
    if (catId && p.categoryId !== catId) return false;
    switch (f) {
      case "new":
        return p.isNew;
      case "feat":
        return p.isFeatured;
      case "stock":
        return p.availability === "in_stock";
      case "order":
        return p.availability === "made_to_order";
      default:
        return true;
    }
  };

  const found = allProducts.filter(match);
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = found.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const catById = new Map(allCats.map((c) => [c.id, c]));
  const baseParams = { f: f !== "all" ? f : undefined, cat: catId ? String(catId) : undefined };
  const pageUrl = (p: number) =>
    buildUrl({ ...baseParams, page: p > 1 ? String(p) : undefined });

  const availTag = (p: (typeof allProducts)[number]) => {
    switch (p.availability) {
      case "reserve":
        return <span className="tag tag--reserve">резерв</span>;
      case "made_to_order":
        return <span className="tag tag--order">под заказ · {p.orderDays ?? 0} дн</span>;
      case "out_of_stock":
        return <span className="tag tag--none">нет на складе</span>;
      default:
        return <span className="tag tag--stock">в наличии</span>;
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Товары</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">всё в одном экземпляре</span>
          <ProductModal
            categories={allCats.map((c) => ({ id: c.id, name: c.name }))}
            finance={finance}
            currencyCode={currencyCode}
          />
        </div>
      </div>

      {/* тулбар */}
      <div className="board board--paper mb-20" style={{ padding: "16px 20px" }}>
        <div
          className="filters"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div className="filters">
            {FILTERS.map((x) => (
              <a
                key={x.value}
                className={f === x.value ? "filter is-active" : "filter"}
                href={buildUrl({
                  ...baseParams,
                  f: x.value !== "all" ? x.value : undefined,
                })}
              >
                {x.label} ({countFor(x.value, catId)})
              </a>
            ))}
          </div>
          <CatFilter
            categories={allCats.map((c) => ({ id: c.id, name: c.name }))}
            value={catId}
            baseParams={baseParams}
          />
        </div>
      </div>

      <div className="board">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Новинка</th>
                <th>Избранное</th>
                <th>Наличие</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="thumb">
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" />
                      ) : null}
                    </div>
                  </td>
                  <td className="cell-name">
                    <b>{p.name}</b>
                    <small>ID (URL): {p.slug}</small>
                  </td>
                  <td>{catById.get(p.categoryId)?.name ?? "—"}</td>
                  <td className="cell-price">{formatPrice(asPriced(p.price, p.priceCurrency), currency, finance)}</td>
                  <td>{p.isNew ? <span className="tag tag--new">новинка</span> : "—"}</td>
                  <td>
                    {p.isFeatured ? <span className="tag tag--reserve">да</span> : "—"}
                  </td>
                  <td>{availTag(p)}</td>
                  <td>
                    <div className="actions">
                      <ProductModal
                        categories={allCats.map((c) => ({ id: c.id, name: c.name }))}
                        product={p}
                        finance={finance}
                        currencyCode={currencyCode}
                      />
                      <DeleteButton
                        url={`/api/admin/products/${p.id}`}
                        confirmText={`Удалить товар «${p.name}»?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="pagination" style={{ justifyContent: "flex-start" }}>
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
  );
}