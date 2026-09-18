import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, asPriced, enTranslit } from "@/lib/format";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { L } from "@/lib/localize";
import Crumbs from "@/components/ui/Crumbs";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import OrderModal from "@/components/product/OrderModal";
import { AvailProduct, availFullText } from "@/components/ui/Avail";

// Автогенерация SEO-названия товара под локаль (D-i18n-2):
// ручной ввод хранится как введён; без него — RU-шаблон из названия,
// EN — транслит названия + EN-шаблон, UK — RU-фолбэк.
function autoTitle(name: string, locale: Locale): string {
  const translated = L(name, locale);
  if (locale === "en") return `${enTranslit(translated)} — JulCraft`;
  return `${translated} — JulCraft`;
}

function autoDescription(desc: string, locale: Locale): string {
  return L(desc, locale).slice(0, 160);
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = db.select().from(products).where(eq(products.slug, slug)).get();
  if (!product) return { title: "Каталог — JulCraft" };

  const locale = await getLocale();

  // SEO-поля из админки; пустые — фолбэк на название/описание/первое фото.
  // Ручной ввод (metaTitle/metaDescription) хранится как введён мастером
  // (D-i18n-2); автогенерация — per-locale (EN — транслит названия).
  const title = L(product.metaTitle, locale) || autoTitle(product.name, locale);
  const description =
    L(product.metaDescription, locale) || autoDescription(product.description, locale);
  const image = product.ogImage || product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = db.select().from(products).where(eq(products.slug, slug)).get();
  if (!product) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const productDict = dict.product;
  const catalogDict = dict.catalog;

  const { finance } = getSettings();
  const currency = await getDisplayCurrency();

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
          { label: catalogDict.crumbsHome, href: "/" },
          { label: catalogDict.crumbsCatalog, href: "/catalog" },
          ...(category ? [{ label: L(category.name, locale), href: `/catalog/${category.slug}` }] : []),
          { label: L(product.name, locale) },
        ]}
      />

      <section className="sect">
        <ProductGallery images={product.images} alt={L(product.name, locale)} dict={productDict} />

        <div className="product-info mt-40" style={{ maxWidth: "640px" }}>
          <h1>{L(product.name, locale)}</h1>
          <span className="price">
            {formatPrice(asPriced(product.price, product.priceCurrency), currency, finance)}
          </span>
          <p className="p-desc">{L(product.description, locale)}</p>
          <p className="p-desc muted">{productDict.staticSecondParagraph}</p>

          {product.materials.length > 0 && (
            <div className="chips mb-20">
              {product.materials.map((m, i) => (
                <span className={i % 2 === 1 ? "chip chip--mustard" : "chip"} key={i}>
                  {L(m, locale)}
                </span>
              ))}
            </div>
          )}

          {product.specs.length > 0 && (
            <ul>
              {product.specs.map((s, i) => (
                <li key={i}>{L(s, locale)}</li>
              ))}
            </ul>
          )}

          <AvailProduct product={product} dict={dict} locale={locale} />

          <div className="cta-row mt-30">
            <OrderModal
              product={product}
              finance={finance}
              currencyCode={currency.code}
              dict={productDict}
              availText={availFullText(product, dict, locale)}
              modalTitle={t(dict, "product.modalTitle", { name: L(product.name, locale) })}
              locale={locale}
            />
            <a className="btn btn--secondary" href={`/configurator/${category?.slug ?? ""}`}>
              {productDict.buildSimilar}
            </a>
          </div>
        </div>
      </section>

      {nearby.length > 0 && (
        <section className="sect">
          <h2 className="sec-h2">{productDict.nearbyTitle}</h2>
          <p className="sec-sub">{productDict.nearbySub}</p>
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
