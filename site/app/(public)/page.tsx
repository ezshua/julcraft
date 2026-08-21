import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, plural } from "@/lib/format";
import { telHref } from "@/lib/settings";
import ProductCard from "@/components/product/ProductCard";
import CategoryCard from "@/components/category/CategoryCard";
import { HOME_CAT_DESC } from "@/components/category/category-captions";
import HoursBoard from "@/components/ui/HoursBoard";

export const metadata: Metadata = {
  title: "JulCraft — витрина · эст. 1976",
};

export default async function HomePage() {
  const settings = getSettings();
  const currency = await getDisplayCurrency();

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
  const countLabel = (cat: (typeof cats)[number], n: number) => {
    if (cat.slug === "komplekty") return `${n} ${plural(n, ["комплект", "комплекта", "комплектов"])}`;
    if (cat.slug === "vintazhnyj-remont") return `от ${formatPrice(cat.workPrice, currency)}`;
    return `${n} ${plural(n, ["изделие", "изделия", "изделий"])}`;
  };

  return (
    <>
      <div className="signboard">
        <p className="est">✹ эст. 1976 · открыто снова ✹</p>
        <h1>JulCraft</h1>
        <p className="tag">украшения · винтажная бижутерия · ремонт бабушкиных бус</p>
        <div className="cta-row">
          <Link className="btn btn--primary" href="/catalog">
            Смотреть каталог
          </Link>
          <Link className="btn btn--secondary" href="/configurator">
            Собрать своё
          </Link>
        </div>
      </div>
      <div className="zigzag"></div>

      {/* Витрина: 12 изделий */}
      <section className="sect">
        <h2 className="sec-h2">Сегодня на витрине</h2>
        <p className="sec-sub">
          {"// всё в одном экземпляре · бакелит, стекло, настоящая ностальгия · 12 штук на полке"}
        </p>
        <div className="shelf">
          {shelf.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Плитка категорий */}
      <section className="sect">
        <h2 className="sec-h2">Разложено по полкам</h2>
        <p className="sec-sub">{"// десять отделов, в каждом — своё настроение"}</p>
        <div className="shelf">
          {cats.map((cat) => (
            <CategoryCard
              key={cat.id}
              slug={cat.slug}
              name={cat.name}
              desc={HOME_CAT_DESC[cat.slug] ?? cat.description}
              count={countLabel(cat, perCategory.get(cat.id) ?? 0)}
              href={cat.slug === "vintazhnyj-remont" ? "/catalog" : `/catalog/${cat.slug}`}
            />
          ))}
        </div>
      </section>

      {/* CTA в конфигуратор */}
      <section className="sect">
        <div className="cta-banner">
          <h2>Соберите своё украшение</h2>
          <p>
            Выберите категорию, добавьте камни и подвески со склада — калькулятор
            сам посчитает цену и срок. Коллаж соберём прямо при вас.
          </p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--primary" href="/configurator">
              Открыть конфигуратор →
            </Link>
          </div>
        </div>
      </section>

      {/* Чек-тизер + часы */}
      <div className="receipt-sec" id="about">
        <div className="receipt">
          <h2>◍ ЧЕК ЗНАКОМСТВА ◍</h2>
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
            <h2 className="sec-h2">Мастерская работает</h2>
            <p className="sec-sub">
              {"// приходите без спешки — у нас радио на кассете и запах воска"}
            </p>
            <p>
              Витрина живёт по законам старых лавок: если свет горит — заходите,
              даже если «закрыто». Юля на месте почти всегда: либо паяет, либо пьёт
              чай с тем, кто зашёл «просто посмотреть».
            </p>
            <p>
              Приносите бабушкины клипсы и одинокие серьги — половине украшений мы
              дарим вторую жизнь прямо при вас.
            </p>
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
