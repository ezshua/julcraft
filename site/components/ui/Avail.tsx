import { reserveDayShort, reserveDayFull } from "@/lib/format";
import type { Product } from "@/drizzle/schema";

// Формы наличия — из макета: полка (span.avail) и карточка товара (span.tag)

type AvailText = {
  text: string;
  cls?: string;
};

export function availInfo(product: Product): AvailText {
  switch (product.availability) {
    case "reserve":
      return {
        text: product.reserveUntil
          ? `⏳ резерв до ${reserveDayShort(product.reserveUntil)}`
          : "⏳ резерв",
        cls: "avail--reserve",
      };
    case "made_to_order":
      return {
        text: `⏳ под заказ · ${product.orderDays ?? 0} дн`,
        cls: "avail--order",
      };
    case "out_of_stock":
      return { text: "✕ нет на складе" };
    default:
      return { text: "✔ в наличии" };
  }
}

/** Полный текст наличия: «резерв до пятницы», «под заказ · 7 дн»… (для модалки) */
export function availFullText(product: Product): string {
  switch (product.availability) {
    case "reserve":
      return product.reserveUntil
        ? `резерв до ${reserveDayFull(product.reserveUntil)}`
        : "резерв";
    case "made_to_order":
      return `под заказ · ${product.orderDays ?? 0} дн`;
    case "out_of_stock":
      return "нет на складе";
    default:
      return "в наличии";
  }
}

export function AvailShelf({ product }: { product: Product }) {
  const { text, cls } = availInfo(product);
  return <span className={cls ? `avail ${cls}` : "avail"}>{text}</span>;
}

export function AvailProduct({ product }: { product: Product }) {
  switch (product.availability) {
    case "reserve":
      return (
        <span className="tag tag--reserve">
          {product.reserveUntil
            ? `⏳ резерв до ${reserveDayFull(product.reserveUntil)}`
            : "⏳ резерв"}
        </span>
      );
    case "made_to_order":
      return (
        <span className="tag tag--order">
          под заказ · {product.orderDays ?? 0} дн
        </span>
      );
    case "out_of_stock":
      return <span className="tag tag--none">нет на складе</span>;
    default:
      return <span className="tag tag--stock">в наличии</span>;
  }
}
