import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced } from "@/lib/format";
import { getDictionary, getLocale, plural as pluralForms, t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.orderSuccess.title"),
    robots: { index: false },
  };
}

type ConfigItem = {
  name?: string;
  qty?: number;
  price?: number;
  processingPrice?: number;
};

function receiptRows(
  order: (typeof orders.$inferSelect) & { productName?: string | null },
  currency: Awaited<ReturnType<typeof getDisplayCurrency>>,
  dict: Awaited<ReturnType<typeof getDictionary>>,
  locale: Awaited<ReturnType<typeof getLocale>>,
) {
  const rows: { label: string; value: string }[] = [];
  const d = dict.orderSuccess;

  const { finance } = getSettings();

  if (order.type === "product") {
    rows.push({ label: d.rowType, value: d.typeProduct });
    rows.push({ label: d.rowComposition, value: order.productName ?? "—" });
    rows.push({ label: d.rowPrice, value: formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance) });
    const contactValue = order.customerName
      ? `${order.customerName}${order.contact ? ` (${order.contact})` : ""}`
      : order.contact;
    rows.push({ label: d.rowContact, value: contactValue });
    rows.push({ label: d.rowMessage, value: order.message });
    rows.push({ label: d.rowStatus, value: d.status[order.status] ?? order.status });
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
    rows.push({ label: d.rowType, value: t(dict, "orderSuccess.typeConfigurator", { category: categoryName }) });
    rows.push({
      label: d.rowComposition,
      value: config.length
        ? config
            .map((c) => `${c.name ?? ""} ×${c.qty ?? 1}`)
            .join(" + ")
        : "—",
    });
    rows.push({ label: d.rowPrice, value: formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance) });
    rows.push({ label: d.rowTerm, value: `${order.calcDays} ${pluralForms(order.calcDays, d.days, locale)}` });
    const contactValue = order.customerName
      ? `${order.customerName}${order.contact ? ` (${order.contact})` : ""}`
      : order.contact;
    rows.push({ label: d.rowContact, value: contactValue });
    rows.push({ label: d.rowMessage, value: order.message });
    rows.push({ label: d.rowStatus, value: d.status[order.status] ?? order.status });
    // collagePath обрабатывается ниже — PNG показывается под чеком
  } else {
    // contact — записка, а не чек
    rows.push({ label: d.rowFrom, value: order.customerName ?? "—" });
    rows.push({ label: d.rowMessage, value: order.message });
    rows.push({ label: d.rowContact, value: order.contact });
    rows.push({
      label: d.rowStatus,
      value:
        d.statusNote[order.status as keyof typeof d.statusNote] ??
        d.status[order.status] ??
        order.status,
    });
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
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.orderSuccess;

  let productName: string | null = null;
  let productImage: string | null = null;
  if (order.productId) {
    const product = db.select().from(products).where(eq(products.id, order.productId)).get();
    productName = product?.name ?? null;
    productImage = product?.images?.[0] ?? null;
  }

  const rows = receiptRows({ ...order, productName }, currency, dict, locale);
  const isNote = order.type === "contact";

  return (
    <>
      <div className="signboard">
        <p className="est">✹ {isNote ? d.estNote : d.estReceipt} ✹</p>
        <h1>{isNote ? d.titleNote : d.titleReceipt}</h1>
        <p className="tagline">
          {isNote ? d.taglineNote : d.taglineReceipt}
        </p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="receipt">
          <h2>{isNote ? d.receiptNoteTitle : t(dict, "orderSuccess.receiptTitle", { id: order.id })}</h2>
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
                alt={d.collageAlt}
                style={{ display: "block", margin: "0 auto", maxWidth: "280px", width: "100%", border: "2px solid var(--brown)", borderRadius: "8px" }}
              />
            </div>
          )}
          {order.type === "product" && productImage && (
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage}
                alt={productName ?? d.productAlt}
                style={{ display: "block", margin: "0 auto", maxWidth: "280px", width: "100%", border: "2px solid var(--brown)", borderRadius: "8px" }}
              />
            </div>
          )}
          <p className="thanks">{d.whatNextTitle}</p>
          {isNote ? (
            <p style={{ fontSize: ".84rem", textAlign: "center", color: "var(--brown)" }}>
              {d.whatNextNote}
              <br />{d.whatNextNoteSecond}
            </p>
          ) : (
            <p style={{ fontSize: ".84rem", textAlign: "center", color: "var(--brown)" }}>
              {d.whatNextReceipt}
              <br />
              {d.whatNextReceiptSecond}
            </p>
          )}
          <div className="cta-row" style={{ justifyContent: "center", marginTop: "20px" }}>
            <Link className="btn btn--primary" href="/">
              {d.homeButton}
            </Link>
            <Link className="btn btn--secondary" href="/catalog">
              {d.catalogButton}
            </Link>
          </div>
          <div className="barcode"></div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
