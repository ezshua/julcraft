import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice } from "@/lib/format";
import Crumbs from "@/components/ui/Crumbs";
import CategoryCard from "@/components/category/CategoryCard";
import { CONFIGURATOR_SLOT_DESC } from "@/components/category/category-captions";

export const metadata: Metadata = {
  title: "Конфигуратор — JulCraft",
};

export default async function ConfiguratorPage() {
  const currency = await getDisplayCurrency();
  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder))
    .all();

  const withTemplate = cats.filter((c) => c.hasSlotTemplate);
  const repair = cats.find((c) => c.slug === "vintazhnyj-remont");

  return (
    <>
      <Crumbs items={[{ label: "Главная", href: "/" }, { label: "Конфигуратор" }]} />

      <div className="signboard signboard--small">
        <p className="est">✹ соберите своё ✹</p>
        <h1>Конфигуратор</h1>
        <p className="tag">
          выберите форму — дальше Юля соберёт украшение из камней и подвесок со
          склада, а калькулятор посчитает цену и срок
        </p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <h2 className="sec-h2">С чего начнём?</h2>
        <p className="sec-sub">
          {"// у каждой категории — свой набор слотов: камень, подвески, шнур, застёжка"}
        </p>
        <div className="shelf">
          {withTemplate.map((cat) => (
            <CategoryCard
              key={cat.id}
              slug={cat.slug}
              name={cat.name}
              desc={CONFIGURATOR_SLOT_DESC[cat.slug] ?? ""}
              count={`работа от ${formatPrice(cat.workPrice, currency)} · ${cat.baseWorkDays} дн`}
              href={`/configurator/${cat.slug}`}
            />
          ))}

          {repair && (
            <CategoryCard
              slug={repair.slug}
              name={repair.name}
              desc="нет шаблона слотов — это услуга"
              count="через форму на контактах"
              href="/contacts"
              disabled
            />
          )}
        </div>

        <div className="mt-40">
          <div className="notice notice--olive">
            Цена = работа категории + стоимость комплектующих + обработка. Срок = база
            категории + дни обработки + поставка «под заказ».
            Точные формулы пересчитываются на сервере при отправке заявки — калькулятор
            в макете показывает текущий расчёт.
          </div>
        </div>
      </section>

      <div className="zigzag"></div>
    </>
  );
}
