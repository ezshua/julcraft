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
  robots: { index: false },
};

const STATUS_TEXT: Record<string, string> = {
  new: "новая · в очереди к верстаку",
  in_progress: "в работе",
  done: "готова",
  cancelled: "отменена",
};

const NOTE_STATUS_TEXT: Record<string, string> = {
  new: "на столе, среди чертежей",
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
    const contactValue = order.customerName
      ? `${order.customerName}${order.contact ? ` (${order.contact})` : ""}`
      : order.contact;
    rows.push({ label: "КОНТАКТ", value: contactValue });
    rows.push({ label: "СООБЩЕНИЕ", value: order.message });
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
    const contactValue = order.customerName
      ? `${order.customerName}${order.contact ? ` (${order.contact})` : ""}`
      : order.contact;
    rows.push({ label: "КОНТАКТ", value: contactValue });
    rows.push({ label: "СООБЩЕНИЕ", value: order.message });
    rows.push({ label: "СТАТУС", value: STATUS_TEXT[order.status] ?? order.status });
    // collagePath обрабатывается ниже — PNG показывается под чеком
  } else {
    // contact — записка, а не чек
    rows.push({ label: "ОТ", value: order.customerName ?? "—" });
    rows.push({ label: "СООБЩЕНИЕ", value: order.message });
    rows.push({ label: "КОНТАКТ", value: order.contact });
    rows.push({ label: "СТАТУС", value: NOTE_STATUS_TEXT[order.status] ?? STATUS_TEXT[order.status] ?? order.status });
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
  let productImage: string | null = null;
  if (order.productId) {
    const product = db.select().from(products).where(eq(products.id, order.productId)).get();
    productName = product?.name ?? null;
    productImage = product?.images?.[0] ?? null;
  }

  const rows = receiptRows({ ...order, productName }, currency);
  const isNote = order.type === "contact";

  return (
    <>
      <div className="signboard">
        <p className="est">✹ {isNote ? "записка получена" : "чек получен"} ✹</p>
        <h1>{isNote ? "Подтверждаю!" : "Заявка принята!"}</h1>
        <p className="tagline">
          {isNote ? "Юля уже заметила конверт и вытирает руки" : "Юля уже глянула на коллаж и ставит чайник"}
        </p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="receipt">
          <h2>{isNote ? `◍ ЗАПИСКА ◍` : `◍ ЧЕК ЗАЯВКИ №${order.id} ◍`}</h2>
          {rows.map((row, i) => (
            <div className="row" key={i}>
              <span>{row.label}</span>
              <span className="r">{row.value}</span>
            </div>
          ))}
          {order.collagePath && (
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.collagePath}
                alt="Коллаж украшения из заявки"
                style={{ display: "block", margin: "0 auto", maxWidth: "280px", width: "100%", border: "2px solid var(--brown)", borderRadius: "8px" }}
              />
            </div>
          )}
          {order.type === "product" && productImage && (
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage}
                alt={productName ?? "Товар из заявки"}
                style={{ display: "block", margin: "0 auto", maxWidth: "280px", width: "100%", border: "2px solid var(--brown)", borderRadius: "8px" }}
              />
            </div>
          )}
          <p className="thanks">*** ЧТО ДАЛЬШЕ ***</p>
          {isNote ? (
            <p style={{ fontSize: ".84rem", textAlign: "center", color: "var(--brown)" }}>
              На первой паузе мастер вдумчиво прочтёт записку
              <br />и ответит вам по указанному контакту.
            </p>
          ) : (
            <p style={{ fontSize: ".84rem", textAlign: "center", color: "var(--brown)" }}>
              Мастер свяжется с вами в течение дня, подтвердит цену и срок
              <br />
              и уточнит детали. Предоплата не нужна — чай бесплатно.
            </p>
          )}
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
