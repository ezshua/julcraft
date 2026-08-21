import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced, plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Заявка принята — JulCraft",
};

const STATUS_TEXT: Record<string, string> = {
  new: "новая · в очереди к верстаку",
  in_progress: "в работе",
  done: "готова",
  cancelled: "отменена",
};

type ConfigItem = {
  name?: string;
  qty?: number;
  price?: number;
  processingPrice?: number;
};

function receiptRows(
  order: (typeof orders.$inferSelect) & { productName?: string | null },
  currency: Awaited<ReturnType<typeof getDisplayCurrency>>,
) {
  const rows: { label: string; value: string }[] = [];

  const { finance } = getSettings();

  if (order.type === "product") {
    rows.push({ label: "ТИП", value: "товар" });
    rows.push({ label: "СОСТАВ", value: order.productName ?? "—" });
    rows.push({ label: "ЦЕНА", value: formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance) });
    rows.push({ label: "КОНТАКТ", value: order.contact });
    rows.push({ label: "СТАТУС", value: STATUS_TEXT[order.status] ?? order.status });
  } else if (order.type === "custom") {
    let config: ConfigItem[] = [];
    let categoryName = "";
    try {
      const parsed = JSON.parse(order.configJson) as {
        items?: ConfigItem[];
        categoryName?: string;
      };
      config = parsed.items ?? [];
      categoryName = parsed.categoryName ?? "";
    } catch {
      // пусто
    }
    rows.push({ label: "ТИП", value: `конфигуратор · ${categoryName}` });
    rows.push({
      label: "СОСТАВ",
      value: config.length
        ? config
            .map((c) => `${c.name ?? ""} ×${c.qty ?? 1}`)
            .join(" + ")
        : "—",
    });
    rows.push({ label: "ЦЕНА", value: formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance) });
    rows.push({ label: "СРОК", value: `${order.calcDays} ${plural(order.calcDays, ["день", "дня", "дней"])}` });
    rows.push({ label: "КОНТАКТ", value: order.contact });
    rows.push({ label: "СТАТУС", value: STATUS_TEXT[order.status] ?? order.status });
    if (order.collagePath) {
      rows.push({ label: "КОЛЛАЖ", value: "приложен к заявке" });
    }
  } else {
    // contact
    rows.push({ label: "ТИП", value: "контакт" });
    rows.push({ label: "СООБЩЕНИЕ", value: order.message });
    rows.push({ label: "КОНТАКТ", value: order.contact });
    rows.push({ label: "СТАТУС", value: STATUS_TEXT[order.status] ?? order.status });
  }
  return rows;
}

export default async function OrderSuccessPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const orderId = Number.parseInt(id, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) notFound();

  const currency = await getDisplayCurrency();

  let productName: string | null = null;
  if (order.productId) {
    const product = db.select().from(products).where(eq(products.id, order.productId)).get();
    productName = product?.name ?? null;
  }

  const rows = receiptRows({ ...order, productName }, currency);

  return (
    <>
      <div className="signboard">
        <p className="est">✹ чек получен ✹</p>
        <h1>Заявка принята!</h1>
        <p className="tag">Юля уже глянула на коллаж и ставит чайник</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="receipt">
          <h2>◍ ЧЕК ЗАЯВКИ №{order.id} ◍</h2>
          {rows.map((row, i) => (
            <div className="row" key={i}>
              <span>{row.label}</span>
              <span className="r">{row.value}</span>
            </div>
          ))}
          <p className="thanks">*** ЧТО ДАЛЬШЕ ***</p>
          <p style={{ fontSize: ".84rem", textAlign: "center", color: "var(--brown)" }}>
            Мастер свяжется с вами в течение дня, подтвердит цену и срок
            <br />
            и уточнит детали. Предоплата не нужна — чай бесплатно.
          </p>
          <div className="cta-row" style={{ justifyContent: "center", marginTop: "20px" }}>
            <Link className="btn btn--primary" href="/">
              На главную
            </Link>
            <Link className="btn btn--secondary" href="/catalog">
              Смотреть каталог
            </Link>
          </div>
          <div className="barcode"></div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
