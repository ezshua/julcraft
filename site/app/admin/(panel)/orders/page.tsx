import type { Metadata } from "next";
import { db } from "@/lib/db";
import { categories, orders, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import type { OrderRow } from "@/components/admin/OrderModal";
import OrderRowView from "@/components/admin/OrderRow";

export const metadata: Metadata = {
  title: "Заявки — JulCraft Админ",
};

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Готово" },
  { value: "cancelled", label: "Отменено" },
] as const;

const TYPE_FILTERS = [
  { value: "all", label: "Все типы" },
  { value: "product", label: "Товар" },
  { value: "custom", label: "Конфигуратор" },
  { value: "contact", label: "Контакт" },
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
        ? product?.name ?? "—"
        : o.type === "contact"
          ? "сообщение от контакта"
          : "коллаж из конфигуратора";
    return {
      id: o.id,
      type: o.type,
      customerName: o.customerName,
      contact: o.contact,
      message: o.message,
      productName: product?.name ?? null,
      categoryName: product ? categoryById.get(product.categoryId)?.name ?? null : null,
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

  const smallText = (o: (typeof allOrders)[number]): string => {
    if (o.type === "product") return productById.get(o.productId ?? 0)?.name ?? "—";
    if (o.type === "contact") return "записка";
    return "конфигуратор";
  };

  return (
    <>
      <div className="page-title">
        <h1>Заявки</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">
            {newCount} новых · ждут звонка
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
                {x.label} ({countFor(x.value, ty)})
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
                {x.label} ({countFor(st, x.value)})
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
                <th>№</th>
                <th>Тип</th>
                <th>Клиент</th>
                <th>Контакт</th>
                <th>Сумма</th>
                <th>Срок</th>
                <th>Коллаж</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
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
                    Заявок нет
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