import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced } from "@/lib/format";
import { getDictionary, getLocale, plural, t } from "@/lib/i18n";
import { L } from "@/lib/localize";
import Crumbs from "@/components/ui/Crumbs";
import CategoryCard from "@/components/category/CategoryCard";
import EmptyState from "@/components/ui/EmptyState";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.catalog.title"),
    description: t(dict, "meta.catalog.description"),
    alternates: { canonical: "/catalog" },
    openGraph: {
      title: t(dict, "meta.catalog.title"),
      description: t(dict, "meta.catalog.descriptionOg"),
      type: "website",
    },
  };
}

export default async function CatalogPage() {
  const currency = await getDisplayCurrency();
  const { finance } = getSettings();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const cat = dict.catalog;
  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)
    .all();
  const allProducts = db.select().from(products).all();
  const perCategory = new Map<number, number>();
  for (const p of allProducts) {
    perCategory.set(p.categoryId, (perCategory.get(p.categoryId) ?? 0) + 1);
  }
  const countLabel = (c: (typeof cats)[number], n: number) => {
    if (c.slug === "komplekty")
      return `${n} ${plural(n, cat.unit.komplekty, locale)}`;
    if (c.slug === "vintazhnyj-remont")
      return t(dict, "catalog.unit.vintazhnyj-remont", {
        price: formatPrice(asPriced(c.workPrice, c.workPriceCurrency), currency, finance),
      });
    return `${n} ${plural(n, cat.unit.default, locale)}`;
  };

  return (
    <>
      <Crumbs
        items={[
          { label: cat.crumbsHome, href: "/" },
          { label: cat.crumbsCatalog },
        ]}
      />

      <div className="signboard signboard--small">
        <p className="est">{cat.est}</p>
        <h1>{cat.title}</h1>
        <p className="tagline">{cat.tagline}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <p className="sec-sub">{cat.secSub}</p>
        {cats.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="shelf">
            {cats.map((c) => (
              <CategoryCard
                key={c.id}
                slug={c.slug}
                name={L(c.name, locale)}
                desc={L(c.description, locale)}
                image={c.image}
                count={countLabel(c, perCategory.get(c.id) ?? 0)}
                href={c.slug === "vintazhnyj-remont" ? "/catalog" : `/catalog/${c.slug}`}
              />
            ))}
          </div>
        )}

        <div className="mt-40">
          <div className="cta-banner">
            <h2>{cat.ctaTitle}</h2>
            <p>{cat.ctaText}</p>
            <Link className="btn btn--primary" href="/configurator">
              {cat.ctaButton}
            </Link>
          </div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
