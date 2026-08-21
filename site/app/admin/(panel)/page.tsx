import Link from "next/link";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { components, orders, products } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced, plural } from "@/lib/format";
import { sumPriced } from "@/lib/currency";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SHORT_DAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

const DAY_MS = 24 * 60 * 60 * 1000;
function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// Дата как в демо дашборда: «сегодня 18:04», «вчера 20:15», «пн 17:38»
function relDate(d: Date): string {
  const now = new Date();
  const today = startOfDay(now);
  const day = startOfDay(d);
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (day.getTime() === today.getTime()) return `сегодня ${hhmm}`;
  if (day.getTime() === today.getTime() - DAY_MS) return `вчера ${hhmm}`;
  return `${SHORT_DAYS[d.getDay()]} ${hhmm}`;
}

// Подпись заявки в колонке «Тип» (как демо: «custom · кулон», «product · брошь»)
function typeLabel(type: string, productName: string | null, configJson: string): string {
  if (type === "product") return `product · ${productName ?? "—"}`;
  if (type === "custom") {
    try {
      const cfg = JSON.parse(configJson) as { category?: string };
      return `custom · ${cfg.category ?? "—"}`;
    } catch {
      return "custom · —";
    }
  }
  return "contact · контакт";
}

export default async function DashboardPage() {
  const currency = await getDisplayCurrency();
  const { finance } = getSettings();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_MS);
  const twoWeeksAgo = new Date(now.getTime() - 2 * WEEK_MS);

  const allProducts = db.select().from(products).all();
  const newCount = allProducts.filter((p) => p.isNew).length;
  const reserveCount = allProducts.filter((p) => p.availability === "reserve").length;

  const weekOrders = db
    .select()
    .from(orders)
    .where(gte(orders.createdAt, weekAgo))
    .all();
  const prevWeekOrders = db
    .select()
    .from(orders)
    .where(and(gte(orders.createdAt, twoWeeksAgo), lt(orders.createdAt, weekAgo)))
    .all();
  const delta = weekOrders.length - prevWeekOrders.length;

  const inProgress = db
    .select()
    .from(orders)
    .where(eq(orders.status, "in_progress"))
    .all();

  const doneWeek = weekOrders.filter((o) => o.status === "done");
  const revenuePriced = sumPriced(
    doneWeek.map((o) => asPriced(o.calcPrice, o.calcPriceCurrency)),
    currency,
    finance,
  );
  const revenueCustomPriced = sumPriced(
    doneWeek
      .filter((o) => o.type === "custom")
      .map((o) => asPriced(o.calcPrice, o.calcPriceCurrency)),
    currency,
    finance,
  );

  const lastOrders = db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(5)
    .all();
  const productById = new Map(allProducts.map((p) => [p.id, p]));

  const stockComponents = db.select().from(components).all();
  const low = stockComponents.filter((c) => c.stockQty <= 5);
  const inStock = stockComponents.some((c) => c.stockQty > 5);

  return (
    <>
      <div className="page-title">
        <h1>Панель мастера</h1>
        <span className="doodle">добрый вечер, Юля ☕</span>
      </div>

      {/* ===== Метрики (D-10, Решения 2/2026-08-20) ===== */}
      <div className="admin-section">
        <div className="metrics">
          <div className="stat-card stat-card--mustard">
            <div className="num">{allProducts.length}</div>
            <div className="lbl">Товаров на витрине</div>
            <div className="sub">
              из них {newCount} {plural(newCount, ["новинка", "новинки", "новинок"])} ·{" "}
              {reserveCount} в резерве
            </div>
          </div>
          <div className="stat-card stat-card--rust">
            <div className="num">{weekOrders.length}</div>
            <div className="lbl">Заявок за неделю</div>
            <div className="sub">
              {delta > 0 ? `+${delta} к прошлой неделе` : "как на прошлой неделе"}
            </div>
          </div>
          <div className="stat-card stat-card--olive">
            <div className="num">{inProgress.length}</div>
            <div className="lbl">В работе сейчас</div>
            <div className="sub">в работе: {inProgress.length}</div>
          </div>
          <div className="stat-card stat-card--brown">
            <div className="num">{formatPrice(revenuePriced, currency, finance)}</div>
            <div className="lbl">Выручка за неделю</div>
            <div className="sub">
              из них {formatPrice(revenueCustomPriced, currency, finance)} — конфигуратор
            </div>
          </div>
        </div>
      </div>

      {/* ===== Последние заявки ===== */}
      <div className="admin-section">
        <div className="board">
          <div className="b-head">
            <h3>Последние заявки</h3>
            <Link className="btn btn--mustard btn--small" href="/admin/orders">
              Все заявки →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Тип</th>
                  <th>Клиент</th>
                  <th>Сумма</th>
                  <th>Срок</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {lastOrders.map((o) => {
                  const product = o.productId ? productById.get(o.productId) : null;
                  return (
                    <tr key={o.id}>
                      <td className="num">{o.id}</td>
                      <td>{typeLabel(o.type, product?.name ?? null, o.configJson)}</td>
                      <td className="cell-name">
                        <b>{o.customerName}</b>
                        <small>{o.contact}</small>
                      </td>
                      <td className="cell-price">
                        {o.type === "contact" ? "—" : formatPrice(asPriced(o.calcPrice, o.calcPriceCurrency), currency, finance)}
                      </td>
                      <td>{o.type === "custom" ? `${o.calcDays} дн` : "—"}</td>
                      <td>
                        <span className={`tag tag--${o.status}`}>{o.status}</span>
                      </td>
                      <td>{relDate(o.createdAt)}</td>
                    </tr>
                  );
                })}
                {lastOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)" }}>
                      Заявок пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== Склад: что кончается (Решение 8: ≤ 5 шт) ===== */}
      <div className="admin-section">
        <div className="board board--paper">
          <div className="b-head">
            <h3>Склад: что кончается</h3>
            <Link className="btn btn--secondary btn--small" href="/admin/components">
              На склад →
            </Link>
          </div>
          <div className="b-body">
            <div className="chips">
              {low
                .sort((a, b) => a.stockQty - b.stockQty)
                .map((c) => (
                  <span
                    key={c.id}
                    className={`chip ${c.stockQty === 0 ? "chip--rust" : "chip--mustard"}`}
                  >
                    {c.name} — {c.stockQty === 0 ? "0 шт" : `${c.stockQty} шт`}
                  </span>
                ))}
              {inStock && <span className="chip chip--olive">Остальное — в норме</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}