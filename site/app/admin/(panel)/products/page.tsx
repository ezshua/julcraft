import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { firstLocale } from "@/lib/localize";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatPrice, asPriced } from "@/lib/format";
import ProductModal from "@/components/admin/ProductModal";
import DeleteButton from "@/components/admin/DeleteButton";
import CatFilter from "@/components/admin/CatFilter";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: dict.admin.products.title };
}

const PAGE_SIZE = 12;

const FILTERS = [
  { value: "all", key: "filterAll" },
  { value: "new", key: "filterNew" },
  { value: "feat", key: "filterFeat" },
  { value: "stock", key: "filterStock" },
  { value: "order", key: "filterOrder" },
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

  const d = getDictionary(await getLocale()).admin.products;
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
  const catName = (c: (typeof allCats)[number]) => firstLocale(c.name);
  const prodName = (p: (typeof allProducts)[number]) => firstLocale(p.name);

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

  const catById = new Map(allCats.map((c) => [c.id, { id: c.id, name: catName(c) }]));
  const baseParams = { f: f !== "all" ? f : undefined, cat: catId ? String(catId) : undefined };
  const pageUrl = (p: number) =>
    buildUrl({ ...baseParams, page: p > 1 ? String(p) : undefined });

  const availTag = (p: (typeof allProducts)[number]) => {
    switch (p.availability) {
      case "reserve":
        return <span className="tag tag--reserve">{d.availReserve}</span>;
      case "made_to_order":
        return (
          <span className="tag tag--order">
            {d.availOrder.replace("{days}", String(p.orderDays ?? 0))}{" "}
          </span>
        );
      case "out_of_stock":
        return <span className="tag tag--none">{d.availNone}</span>;
      default:
        return <span className="tag tag--stock">{d.availStock}</span>;
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>{d.heading}</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">{d.doodle}</span>
          <ProductModal
            categories={allCats.map((c) => ({ id: c.id, name: catName(c) }))}
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
                {d[x.key]} ({countFor(x.value, catId)})
              </a>
            ))}
          </div>
          <CatFilter
            categories={allCats.map((c) => ({ id: c.id, name: catName(c) }))}
            value={catId}
            baseParams={baseParams}
            dict={{ labelCategoryAll: d.labelCategoryAll, labelCategory: d.labelCategory }}
          />
        </div>
      </div>

      <div className="board">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{d.colPhoto}</th>
                <th>{d.colName}</th>
                <th>{d.colCategory}</th>
                <th>{d.colPrice}</th>
                <th>{d.colNew}</th>
                <th>{d.colFeat}</th>
                <th>{d.colAvail}</th>
                <th>{d.colActions}</th>
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
                    <b>{prodName(p)}</b>
                    <small>{d.slugHint}: {p.slug}</small>
                  </td>
                  <td>{catById.get(p.categoryId)?.name ?? "—"}</td>
                  <td className="cell-price">{formatPrice(asPriced(p.price, p.priceCurrency), currency, finance)}</td>
                  <td>
                    {p.isNew ? (
                      <span className="tag tag--new">{d.newTag}</span>
                    ) : (
                      d.featNo
                    )}
                  </td>
                  <td>
                    {p.isFeatured ? (
                      <span className="tag tag--reserve">{d.featYes}</span>
                    ) : (
                      d.featNo
                    )}
                  </td>
                  <td>{availTag(p)}</td>
                  <td>
                    <div className="actions">
                      <ProductModal
                        categories={allCats.map((c) => ({ id: c.id, name: catName(c) }))}
                        product={p}
                        finance={finance}
                        currencyCode={currencyCode}
                      />
                      <DeleteButton
                        url={`/api/admin/products/${p.id}`}
                        confirmText={d.confirmDelete.replace("{name}", prodName(p))}
                        dict={{ deleteTitle: d.deleteTitle, deleteFailed: d.deleteFailed }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>
                    {d.nothingFound}
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