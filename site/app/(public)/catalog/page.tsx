import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced, plural } from "@/lib/format";
import Crumbs from "@/components/ui/Crumbs";
import CategoryCard from "@/components/category/CategoryCard";

export const metadata: Metadata = {
  title: "Каталог — JulCraft",
};

export default async function CatalogPage() {
  const currency = await getDisplayCurrency();
  const { finance } = getSettings();
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
  const countLabel = (cat: (typeof cats)[number], n: number) => {
    if (cat.slug === "komplekty") return `${n} ${plural(n, ["комплект", "комплекта", "комплектов"])}`;
    if (cat.slug === "vintazhnyj-remont") return `услуга · от ${formatPrice(asPriced(cat.workPrice, cat.workPriceCurrency), currency, finance)}`;
    return `${n} ${plural(n, ["изделие", "изделия", "изделий"])}`;
  };

  return (
    <>
      <Crumbs items={[{ label: "Главная", href: "/" }, { label: "Каталог" }]} />

      <div className="signboard signboard--small">
        <p className="est">✹ десять полок ✹</p>
        <h1>Каталог</h1>
        <p className="tag">
          всё в одном экземпляре — если понравилось, не откладывайте на завтра
        </p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <p className="sec-sub">
          {"// 10 отделов · бакелит, стекло, эмаль, латунь и немного волшебства"}
        </p>
        <div className="shelf">
          {cats.map((cat) => (
            <CategoryCard
              key={cat.id}
              slug={cat.slug}
              name={cat.name}
              desc={cat.description}
              count={countLabel(cat, perCategory.get(cat.id) ?? 0)}
              href={cat.slug === "vintazhnyj-remont" ? "/catalog" : `/catalog/${cat.slug}`}
            />
          ))}
        </div>

        <div className="mt-40">
          <div className="cta-banner">
            <h2>Не нашли своё?</h2>
            <p>
              Соберите украшение сами — из камней, подвесок и шнуров со склада
              мастерской.
            </p>
            <a className="btn btn--primary" href="/configurator">
              Открыть конфигуратор →
            </a>
          </div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
