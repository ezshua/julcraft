import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getDisplayCurrency } from "@/lib/currency-server";
import type { Product } from "@/drizzle/schema";
import { AvailShelf } from "@/components/ui/Avail";

// Копия карточки товара из mockup/home.html: a.item
export default async function ProductCard({ product }: { product: Product }) {
  const currency = await getDisplayCurrency();
  return (
    <Link className="item" href={`/product/${product.slug}`}>
      {product.isNew && <span className="badge badge--new">новинка</span>}
      {product.isFeatured && <span className="badge badge--feat">избранное</span>}
      <div className="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="info">
        <h3>{product.name}</h3>
        <p className="desc">{product.description}</p>
        <div className="tag-row">
          <span className="price">{formatPrice(product.price, currency)}</span>
          <AvailShelf product={product} />
        </div>
      </div>
    </Link>
  );
}
