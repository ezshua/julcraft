import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { formatPrice } from "@/lib/format";
import Crumbs from "@/components/ui/Crumbs";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import OrderModal from "@/components/product/OrderModal";
import { AvailProduct } from "@/components/ui/Avail";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = db.select().from(products).where(eq(products.slug, slug)).get();
  if (!product) return { title: "Каталог — JulCraft" };
  return { title: `${product.name} — JulCraft` };
}

// Второй абзац описания — статичная копия из макета (не привязан к данным)
const MUTED_DESC = [
  "Цепочка латунная, 50 см, уже в комплекте. Носится с чем угодно — проверено на витрине,",
  "покупателях и одной очень строгой кошке.",
].join(" ");

export default async function ProductPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = db.select().from(products).where(eq(products.slug, slug)).get();
  if (!product) notFound();

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, product.categoryId))
    .get();
  const nearby = db
    .select()
    .from(products)
    .where(eq(products.categoryId, product.categoryId))
    .orderBy(asc(products.id))
    .all()
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <>
      <Crumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          ...(category ? [{ label: category.name, href: `/catalog/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <section className="sect">
        <ProductGallery images={product.images} alt={product.name} />

        <div className="product-info mt-40" style={{ maxWidth: "640px" }}>
          <h1>{product.name}</h1>
          <span className="price">{formatPrice(product.price)}</span>
          <p className="p-desc">{product.description}</p>
          <p className="p-desc muted">{MUTED_DESC}</p>

          {product.materials.length > 0 && (
            <div className="chips mb-20">
              {product.materials.map((m, i) => (
                <span className={i % 2 === 1 ? "chip chip--mustard" : "chip"} key={i}>
                  {m}
                </span>
              ))}
            </div>
          )}

          {product.specs.length > 0 && (
            <ul>
              {product.specs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}

          <AvailProduct product={product} />

          <div className="cta-row mt-30">
            <OrderModal product={product} />
            <a className="btn btn--secondary" href={`/configurator/${category?.slug ?? ""}`}>
              Собрать похожий →
            </a>
          </div>
        </div>
      </section>

      {nearby.length > 0 && (
        <section className="sect">
          <h2 className="sec-h2">Рядом на полке</h2>
          <p className="sec-sub">{"// тоже хорошие, тоже в одном экземпляре"}</p>
          <div className="shelf">
            {nearby.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <div className="zigzag"></div>
    </>
  );
}
