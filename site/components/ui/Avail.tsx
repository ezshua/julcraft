import type { Product } from "@/drizzle/schema";
import type { Dictionary } from "@/lib/dictionaries/ru";
import { plural, t, type Locale } from "@/lib/i18n";

// Формы наличия — из макета: полка (span.avail) и карточка товара (span.tag)

type AvailText = {
  text: string;
  cls?: string;
};

function dayShort(dict: Dictionary, d: Date): string {
  return dict.product.daysShort[d.getDay()];
}

function dayFull(dict: Dictionary, d: Date): string {
  return dict.product.daysFull[d.getDay()];
}

export function availInfo(
  product: Product,
  dict: Dictionary,
  locale: Locale,
): AvailText {
  switch (product.availability) {
    case "reserve":
      return {
        text: product.reserveUntil
          ? t(dict, "product.avail.reserveUntil", {
              day: dayShort(dict, product.reserveUntil),
            })
          : dict.product.avail.reserve,
        cls: "avail--reserve",
      };
    case "made_to_order":
      return {
        text: t(dict, "product.avail.orderShelf", {
          n: product.orderDays ?? 0,
          days: plural(product.orderDays ?? 0, dict.product.days, locale),
        }),
        cls: "avail--order",
      };
    case "out_of_stock":
      return { text: dict.product.avail.outOfStockShelf };
    default:
      return { text: dict.product.avail.inStockShelf };
  }
}

/** Полный текст наличия: «резерв до пятницы», «под заказ · 7 дн»… (для модалки) */
export function availFullText(
  product: Product,
  dict: Dictionary,
  locale: Locale,
): string {
  switch (product.availability) {
    case "reserve":
      return product.reserveUntil
        ? t(dict, "product.avail.reserveUntilPlain", {
            day: dayFull(dict, product.reserveUntil),
          })
        : dict.product.avail.reservePlain;
    case "made_to_order":
      return t(dict, "product.avail.orderPlain", {
        n: product.orderDays ?? 0,
        days: plural(product.orderDays ?? 0, dict.product.days, locale),
      });
    case "out_of_stock":
      return dict.product.avail.outOfStockPlain;
    default:
      return dict.product.avail.inStockPlain;
  }
}

export function AvailShelf({
  product,
  dict,
  locale,
}: {
  product: Product;
  dict: Dictionary;
  locale: Locale;
}) {
  const { text, cls } = availInfo(product, dict, locale);
  return <span className={cls ? `avail ${cls}` : "avail"}>{text}</span>;
}

export function AvailProduct({
  product,
  dict,
  locale,
}: {
  product: Product;
  dict: Dictionary;
  locale: Locale;
}) {
  switch (product.availability) {
    case "reserve":
      return (
        <span className="tag tag--reserve">
          {product.reserveUntil
            ? t(dict, "product.avail.reserveUntil", {
                day: dayFull(dict, product.reserveUntil),
              })
            : dict.product.avail.reserve}
        </span>
      );
    case "made_to_order":
      return (
        <span className="tag tag--order">
          {t(dict, "product.avail.orderPlain", {
            n: product.orderDays ?? 0,
            days: plural(product.orderDays ?? 0, dict.product.days, locale),
          })}
        </span>
      );
    case "out_of_stock":
      return (
        <span className="tag tag--none">{dict.product.avail.outOfStockPlain}</span>
      );
    default:
      return (
        <span className="tag tag--stock">{dict.product.avail.inStockPlain}</span>
      );
  }
}
