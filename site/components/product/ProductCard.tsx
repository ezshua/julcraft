import Link from "next/link";
import Image from "next/image";
import { formatPrice, asPriced } from "@/lib/format";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { getDictionary, getLocale } from "@/lib/i18n";
import type { Product } from "@/drizzle/schema";
import { AvailShelf } from "@/components/ui/Avail";

// Копия карточки товара из mockup/home.html: a.item
export default async function ProductCard({ product }: { product: Product }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const productDict = dict.product;
  const currency = await getDisplayCurrency();
  const { finance } = getSettings();
  return (
    <Link className="item" href={`/product/${product.slug}`}>
      {product.isNew && <span className="badge badge--new">{productDict.badgeNew}</span>}
      {product.isFeatured && (
        <span className="badge badge--feat">{productDict.badgeFeatured}</span>
      )}
      <div className="photo" style={{ position: "relative" }}>
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1079px) 50vw, 33vw"
        />
      </div>
      <div className="info">
        <h3>{product.name}</h3>
        <p className="desc">{product.description}</p>
        <div className="tag-row">
          <span className="price">
            {formatPrice(asPriced(product.price, product.priceCurrency), currency, finance)}
          </span>
          <AvailShelf product={product} dict={dict} locale={locale} />
        </div>
      </div>
    </Link>
  );
}
