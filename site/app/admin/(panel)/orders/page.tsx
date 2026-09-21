import type { Metadata } from "next";
import { db } from "@/lib/db";
import { categories, orders, products } from "@/drizzle/schema";
import { firstLocale } from "@/lib/localize";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getDictionary, getLocale } from "@/lib/i18n";
import type { OrderRow } from "@/components/admin/OrderModal";
import OrderRowView from "@/components/admin/OrderRow";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: dict.admin.orders.title };
}

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "all", key: "filterAll" },
  { value: "new", key: "filterNew" },
  { value: "in_progress", key: "filterInProgress" },
  { value: "done", key: "filterDone" },
  { value: "cancelled", key: "filterCancelled" },
] as const;

const TYPE_FILTERS = [
  { value: "all", key: "filterTypeAll" },
  { value: "product", key: "filterTypeProduct" },
  { value: "custom", key: "filterTypeCustom" },
  { value: "contact", key: "filterTypeContact" },
] as const;

function buildUrl(params: Record<string, string | undefined>): string {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.set(k, v);
  }
  const qs = url.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ st?: string; ty?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const d = getDictionary(await getLocale()).admin.orders;
  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const currencyCode = currency.code;

  const st = STATUS_FILTERS.some((x) => x.value === sp.st) ? sp.st! : "all";
  const ty = TYPE_FILTERS.some((x) => x.value === sp.ty) ? sp.ty! : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const allOrders = db.select().from(orders).all();
  const allProducts = db.select().from(products).all();
  const allCategories = db.select().from(categories).all();

  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const prodName = (p: (typeof allProducts)[number]) => firstLocale(p.name);
  const catName = (c: (typeof allCategories)[number] | undefined) =>
    c ? firstLocale(c.name) : null;

  const match = (o: (typeof allOrders)[number]) => {
    if (st !== "all" && o.status !== st) return false;
    if (ty !== "all" && o.type !== ty) return false;
    return true;
  };

  const countFor = (st2: string, ty2: string) =>
    allOrders.filter((o) => {
      if (st2 !== "all" && o.status !== st2) return false;
      if (ty2 !== "all" && o.type !== ty2) return false;
      return true;
    }).length;

  const found = allOrders.filter(match).sort((a, b) => b.id - a.id);
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = found.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const rows: (OrderRow & { smallText: string })[] = pageItems.map((o) => {
    const product = o.productId != null ? productById.get(o.productId) : undefined;
    const smallText =
      o.type === "product"
        ? prodName(product as (typeof allProducts)[number]) ?? d.emptyDash
        : o.type === "contact"
          ? d.contactMessage
          : d.collageFromConfig;
    return {
      id: o.id,
      type: o.type,
      customerName: o.customerName,
      contact: o.contact,
      message: o.message,
      productName: product ? prodName(product as (typeof allProducts)[number]) ?? null : null,
      categoryName: product ? catName(categoryById.get(product.categoryId) as (typeof allCategories)[number]) ?? null : null,
      configJson: o.configJson,
      collagePath: o.collagePath,
      calcPrice: o.calcPrice,
      calcPriceCurrency: o.calcPriceCurrency,
      calcDays: o.calcDays,
      status: o.status,
      createdAt: o.createdAt,
      smallText,
    };
  });

  const baseParams = { st: st !== "all" ? st : undefined, ty: ty !== "all" ? ty : undefined };
  const pageUrl = (p: number) =>
    buildUrl({ ...baseParams, page: p > 1 ? String(p) : undefined });

  const newCount = allOrders.filter((o) => o.status === "new").length;

  return (
    <>
      <div className="page-title">
        <h1>{d.heading}</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">
            {newCount} {d.newCountSuffix}
          </span>
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
            {STATUS_FILTERS.map((x) => (
              <a
                key={x.value}
                className={st === x.value ? "filter is-active" : "filter"}
                href={buildUrl({ ...baseParams, st: x.value !== "all" ? x.value : undefined })}
              >
                {d[x.key]} ({countFor(x.value, ty)})
              </a>
            ))}
          </div>
          <div className="filters">
            {TYPE_FILTERS.map((x) => (
              <a
                key={x.value}
                className={ty === x.value ? "filter is-active" : "filter"}
                href={buildUrl({ ...baseParams, ty: x.value !== "all" ? x.value : undefined })}
              >
                {d[x.key]} ({countFor(st, x.value)})
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="board">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{d.colNum}</th>
                <th>{d.colType}</th>
                <th>{d.colClient}</th>
                <th>{d.colContact}</th>
                <th>{d.colAmount}</th>
                <th>{d.colTerm}</th>
                <th>{d.colCollage}</th>
                <th>{d.colStatus}</th>
                <th>{d.colDate}</th>
                <th>{d.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <OrderRowView
                  key={r.id}
                  order={r}
                  smallText={r.smallText}
                  finance={finance}
                  currencyCode={currencyCode}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "var(--muted)" }}>
                    {d.noOrders}
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