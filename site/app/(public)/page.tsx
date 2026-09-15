import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, asPriced } from "@/lib/format";
import { telHref } from "@/lib/settings";
import { getDictionary, getLocale, plural, t } from "@/lib/i18n";
import ProductCard from "@/components/product/ProductCard";
import CategoryCard from "@/components/category/CategoryCard";
import EmptyState from "@/components/ui/EmptyState";
import HoursBoard from "@/components/ui/HoursBoard";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.home.title"),
    description: t(dict, "meta.home.description"),
    alternates: { canonical: "/" },
    openGraph: {
      title: t(dict, "meta.home.title"),
      description: t(dict, "meta.home.descriptionOg"),
      type: "website",
    },
  };
}

export default async function HomePage() {
  const settings = getSettings();
  const { finance } = settings;
  const currency = await getDisplayCurrency();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const home = dict.home;

  // Витрина: правило R-1 — сначала избранное, затем новинки, затем остальные
  const allProducts = db.select().from(products).all();
  const byId = (a: (typeof allProducts)[number], b: (typeof allProducts)[number]) =>
    a.id - b.id;
  const shelf = [
    ...allProducts.filter((p) => p.isFeatured).sort(byId),
    ...allProducts.filter((p) => p.isNew && !p.isFeatured).sort(byId),
    ...allProducts.filter((p) => !p.isNew && !p.isFeatured).sort(byId),
  ].slice(0, 12);

  // Плитка категорий
  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)
    .all();
  const perCategory = new Map<number, number>();
  for (const p of allProducts) {
    perCategory.set(p.categoryId, (perCategory.get(p.categoryId) ?? 0) + 1);
  }
  // Короткая подпись категории — первое предложение description (до первой точки, решение №4)
  const shortDesc = (cat: (typeof cats)[number]) => {
    const dot = cat.description.indexOf(".");
    return dot > 0 ? cat.description.slice(0, dot) : cat.description;
  };
  const countLabel = (cat: (typeof cats)[number], n: number) => {
    if (cat.slug === "komplekty") return `${n} ${plural(n, home.unitKomplekty, locale)}`;
    if (cat.slug === "vintazhnyj-remont")
      return t(dict, "home.unitRemontFrom", {
        price: formatPrice(asPriced(cat.workPrice, cat.workPriceCurrency), currency, finance),
      });
    return `${n} ${plural(n, home.unitDefault, locale)}`;
  };

  return (
    <>
      <div className="signboard">
        <p className="est">{home.est}</p>
        <h1>JulCraft</h1>
        <p className="tagline">{home.tagline}</p>
        <div className="cta-row">
          <Link className="btn btn--primary" href="/catalog">
            {home.catalogCta}
          </Link>
          <Link className="btn btn--secondary" href="/configurator">
            {home.buildCta}
          </Link>
        </div>
      </div>
      <div className="zigzag"></div>

      {/* Витрина: 12 изделий */}
      <section className="sect">
        <h2 className="sec-h2">{home.showcaseTitle}</h2>
        <p className="sec-sub">{home.showcaseSub}</p>
        {shelf.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="shelf">
            {shelf.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Плитка категорий */}
      <section className="sect">
        <h2 className="sec-h2">{home.shelfTitle}</h2>
        <p className="sec-sub">{home.shelfSub}</p>
        {cats.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="shelf">
            {cats.map((cat) => (
              <CategoryCard
                key={cat.id}
                slug={cat.slug}
                name={cat.name}
                desc={shortDesc(cat)}
                image={cat.image}
                count={countLabel(cat, perCategory.get(cat.id) ?? 0)}
                href={cat.slug === "vintazhnyj-remont" ? "/catalog" : `/catalog/${cat.slug}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA в конфигуратор */}
      <section className="sect">
        <div className="cta-banner">
          <h2>{home.ctaBannerTitle}</h2>
          <p>{home.ctaBannerText}</p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--primary" href="/configurator">
              {home.ctaBannerButton}
            </Link>
          </div>
        </div>
      </section>

      {/* Чек-тизер + часы */}
      <div className="receipt-sec" id="about">
        <div className="receipt">
          <h2>{home.receiptTitle}</h2>
          {settings.about.short.rows.map((row, i) => (
            <div className="row" key={i}>
              <span>{row.label}</span>
              <span className="r">{row.value}</span>
            </div>
          ))}
          <p className="thanks">{settings.about.short.thanks}</p>
          <div className="barcode"></div>
        </div>
      </div>

      <section className="sect">
        <div className="hours-grid">
          <div className="hours-txt">
            <h2 className="sec-h2">{home.hoursTitle}</h2>
            <p className="sec-sub">{home.hoursSub}</p>
            <p>{home.hoursText1}</p>
            <p>{home.hoursText2}</p>
            <a className="phone" href={telHref(settings.contacts.phone)}>
              ☎ {settings.contacts.phone}
            </a>
          </div>
          <HoursBoard hours={settings.contacts.hours} />
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
