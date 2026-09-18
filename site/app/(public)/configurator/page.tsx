import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, slotTemplates } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced } from "@/lib/format";
import { getDictionary, getLocale, plural, t } from "@/lib/i18n";
import { L } from "@/lib/localize";
import Crumbs from "@/components/ui/Crumbs";
import EmptyState from "@/components/ui/EmptyState";
import CategoryCard from "@/components/category/CategoryCard";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.configurator.title"),
    description: t(dict, "meta.configurator.description"),
    alternates: { canonical: "/configurator" },
    openGraph: {
      title: t(dict, "meta.configurator.title"),
      description: t(dict, "meta.configurator.descriptionOg"),
      type: "website",
    },
  };
}

export default async function ConfiguratorPage() {
  const currency = await getDisplayCurrency();
  const { finance } = getSettings();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const conf = dict.configurator;
  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder))
    .all();

  const withTemplate = cats.filter((c) => c.hasSlotTemplate);
  const repair = cats.find((c) => c.slug === "vintazhnyj-remont");

  // Подпись карточки — из БД: «{N} слот(ов): {имена слотов через запятую}» (решение №4)
  const slotsByCategory = db.select().from(slotTemplates).orderBy(asc(slotTemplates.sortOrder)).all();
  const slotDesc = new Map<number, string>();
  for (const cat of withTemplate) {
    const slots = slotsByCategory.filter((s) => s.categoryId === cat.id);
    if (slots.length > 0) {
      slotDesc.set(
        cat.id,
        t(dict, "configurator.slotDesc", {
          n: slots.length,
          word: plural(slots.length, conf.slotWord, locale),
          names: slots.map((s) => L(s.name, locale)).join(", "),
        }),
      );
    }
  }

  return (
    <>
      <Crumbs items={[{ label: conf.crumbsHome, href: "/" }, { label: conf.crumbsConfigurator }]} />

      <div className="signboard signboard--small">
        <p className="est">{conf.est}</p>
        <h1>{conf.title}</h1>
        <p className="tagline">{conf.tagline}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <h2 className="sec-h2">{conf.chooseTitle}</h2>
        <p className="sec-sub">{conf.chooseSub}</p>
        <div className="shelf">
          {withTemplate.length === 0 ? (
            <EmptyState />
          ) : (
            withTemplate.map((cat) => (
              <CategoryCard
                key={cat.id}
                slug={cat.slug}
                name={L(cat.name, locale)}
                desc={slotDesc.get(cat.id) ?? ""}
                image={cat.image}
                count={t(dict, "configurator.workFrom", {
                  price: formatPrice(asPriced(cat.workPrice, cat.workPriceCurrency), currency, finance),
                  n: cat.baseWorkDays,
                })}
                href={`/configurator/${cat.slug}`}
              />
            ))
          )}

          {repair && (
            <CategoryCard
              slug={repair.slug}
              name={L(repair.name, locale)}
              image={repair.image}
              desc={conf.repairDesc}
              count={conf.repairCount}
              href="/contacts"
              disabled
            />
          )}
        </div>

        <div className="mt-40">
          <div className="notice notice--olive">{conf.notice}</div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
