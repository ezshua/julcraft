import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, slotTemplates } from "@/drizzle/schema";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/get-settings";
import { formatPrice, asPriced, plural } from "@/lib/format";
import Crumbs from "@/components/ui/Crumbs";
import CategoryCard from "@/components/category/CategoryCard";

export const metadata: Metadata = {
  title: "Конфигуратор — JulCraft",
  description:
    "Соберите украшение сами: выберите форму, камни и подвески со склада мастерской — калькулятор посчитает цену и срок.",
  alternates: { canonical: "/configurator" },
  openGraph: {
    title: "Конфигуратор — JulCraft",
    description:
      "Соберите украшение сами из камней, подвесок и шнуров со склада мастерской.",
    type: "website",
  },
};

export default async function ConfiguratorPage() {
  const currency = await getDisplayCurrency();
  const { finance } = getSettings();
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
        `${slots.length} ${plural(slots.length, ["слот", "слота", "слотов"])}: ${slots.map((s) => s.name).join(", ")}`,
      );
    }
  }

  return (
    <>
      <Crumbs items={[{ label: "Главная", href: "/" }, { label: "Конфигуратор" }]} />

      <div className="signboard signboard--small">
        <p className="est">✹ соберите своё ✹</p>
        <h1>Конфигуратор</h1>
        <p className="tagline">
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
              desc={slotDesc.get(cat.id) ?? ""}
              count={`работа от ${formatPrice(asPriced(cat.workPrice, cat.workPriceCurrency), currency, finance)} · ${cat.baseWorkDays} дн`}
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
