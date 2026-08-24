import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { components } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getActiveComponentTypes, getComponentTypes } from "@/lib/component-types";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, asPriced } from "@/lib/format";
import ComponentModal from "@/components/admin/ComponentModal";
import DeleteButton from "@/components/admin/DeleteButton";
import StockFilter from "@/components/admin/StockFilter";

export const metadata: Metadata = {
  title: "Склад комплектующих — JulCraft Админ",
};

const PAGE_SIZE = 12;

// Палитра тегов по кругу (sortOrder): цвета из style-memphis.css.
const TAG_CYCLE = [
  "tag--reserve",
  "tag--new",
  "tag--mustard",
  "tag--olive",
  "tag--in_progress",
  "tag--stock",
] as const;

function buildUrl(params: Record<string, string | undefined>): string {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.set(k, v);
  }
  const qs = url.toString();
  return qs ? `/admin/components?${qs}` : "/admin/components";
}

export default async function AdminComponentsPage(props: {
  searchParams: Promise<{ t?: string; st?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const currencyCode = currency.code;

  // Активные типы из БД: фильтры тулбара и опции модалок (план componentsExt).
  // Все типы (включая неактивные) — для подписей/палитры существующих строк.
  const activeTypes = getActiveComponentTypes();
  const allTypes = getComponentTypes();
  const typeFilters = [
    { value: "", label: "Все" },
    ...activeTypes.map((ty) => ({ value: ty.code, label: ty.name })),
  ];
  const t = typeFilters.some((x) => x.value === sp.t) ? sp.t! : "";
  const st = ["any", "in", "zero"].includes(sp.st ?? "") ? sp.st! : "any";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const allComponents = db.select().from(components).orderBy(asc(components.id)).all();

  const match = (c: (typeof allComponents)[number]) => {
    if (t && c.componentType !== t) return false;
    switch (st) {
      case "in":
        return c.stockQty > 0;
      case "zero":
        return c.stockQty === 0;
      default:
        return true;
    }
  };

  const countFor = (type: string, st2: string) =>
    allComponents.filter((c) => {
      if (type && c.componentType !== type) return false;
      switch (st2) {
        case "in":
          return c.stockQty > 0;
        case "zero":
          return c.stockQty === 0;
        default:
          return true;
      }
    }).length;

  const found = allComponents.filter(match);
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = found.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const baseParams = { t: t || undefined, st: st !== "any" ? st : undefined };
  const pageUrl = (p: number) =>
    buildUrl({ ...baseParams, page: p > 1 ? String(p) : undefined });

  return (
    <>
      <div className="page-title">
        <h1>Склад комплектующих</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">PNG на белом фоне!</span>
          <ComponentModal
            finance={finance}
            currencyCode={currencyCode}
            typeOptions={activeTypes.map((ty) => ({
              value: ty.code,
              label: ty.name,
            }))}
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
            {typeFilters.map((x) => (
              <a
                key={x.value || "all"}
                className={t === x.value ? "filter is-active" : "filter"}
                href={buildUrl({
                  ...baseParams,
                  t: x.value || undefined,
                })}
              >
                {x.label} ({countFor(x.value, st)})
              </a>
            ))}
          </div>
          <StockFilter value={st} baseParams={baseParams} />
        </div>
      </div>

      <div className="board">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Название</th>
                <th>Тип</th>
                <th>Цена закупки</th>
                <th>Обработка</th>
                <th>Остаток</th>
                <th>Под заказ</th>
                <th>Срок, дн</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.photo} alt="" />
                    </div>
                  </td>
                  <td className="cell-name">
                    <b>{c.name}</b>
                    <small>type: {c.componentType}</small>
                  </td>
                  <td>
                    <span
                      className={`tag ${
                        TAG_CYCLE[
                          Math.abs(allTypes.findIndex((ty) => ty.code === c.componentType)) %
                            TAG_CYCLE.length
                        ]
                      }`}
                      title={allTypes.find((ty) => ty.code === c.componentType)?.isActive === false ? "тип деактивирован" : undefined}
                    >
                      {
                        allTypes.find((ty) => ty.code === c.componentType)?.name ??
                        c.componentType
                      }
                    </span>
                  </td>
                  <td className="cell-price">{formatPrice(asPriced(c.price, c.priceCurrency), currency, finance)}</td>
                  <td className="cell-price">{formatPrice(asPriced(c.processingPrice, c.processingPriceCurrency), currency, finance)}</td>
                  <td className={c.stockQty === 0 ? "num num--zero" : "num"}>
                    {c.stockQty}
                  </td>
                  <td>
                    {c.isOrderable ? (
                      <span className="tag tag--order">да</span>
                    ) : (
                      <span className="tag tag--none">нет</span>
                    )}
                  </td>
                  <td>{c.deliveryDays ?? "—"}</td>
                  <td>
                    <div className="actions">
                      <ComponentModal
                        component={c}
                        finance={finance}
                        currencyCode={currencyCode}
                        typeOptions={activeTypes.map((ty) => ({
                          value: ty.code,
                          label: ty.name,
                        }))}
                      />
                      <DeleteButton
                        url={`/api/admin/components/${c.id}`}
                        confirmText={`Удалить комплектующее «${c.name}»?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)" }}>
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