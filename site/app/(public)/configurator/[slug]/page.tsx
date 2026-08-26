import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, components, componentTypes, slotTemplates } from "@/drizzle/schema";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import ConfiguratorClient from "@/components/configurator/ConfiguratorClient";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const category = db.select().from(categories).where(eq(categories.slug, slug)).get();
  const title = category
    ? `Конфигуратор — ${category.name} · JulCraft`
    : "Конфигуратор — JulCraft";
  const description = category
    ? `Соберите ${category.name.toLowerCase()} сами: слоты, комплектующие со склада, калькулятор цены и срока.`
    : "Конфигуратор украшений JulCraft";
  return {
    title,
    description,
    alternates: { canonical: `/configurator/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

// Страница категории конфигуратора (T-5.1) — копия mockup/configurator-config.html.
// Данные — из БД на момент запроса; клиент получает сериализуемые props и считает live.
export default async function ConfiguratorCategoryPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const category = db.select().from(categories).where(eq(categories.slug, slug)).get();
  if (!category || !category.isActive || !category.hasSlotTemplate) notFound();

  const slots = db
    .select()
    .from(slotTemplates)
    .where(eq(slotTemplates.categoryId, category.id))
    .orderBy(asc(slotTemplates.sortOrder))
    .all();

  const comps = db
    .select()
    .from(components)
    .where(eq(components.isActive, true))
    .orderBy(asc(components.id))
    .all();

  // Человекочитаемые имена типов — из справочника БД (для tag-строки signboard)
  const typeNames = new Map(
    db
      .select()
      .from(componentTypes)
      .orderBy(asc(componentTypes.sortOrder))
      .all()
      .filter((t) => t.isActive)
      .map((t) => [t.code, t.name]),
  );

  const { finance } = getSettings();
  const currency = await getDisplayCurrency();

  const slotTypes = [...new Set(slots.map((s) => s.componentType))];

  return (
    <ConfiguratorClient
      category={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        workPriceMinor: category.workPrice,
        workPriceCurrency: category.workPriceCurrency,
        baseWorkDays: category.baseWorkDays,
      }}
      slots={slots.map((s) => ({
        id: s.id,
        name: s.name,
        componentType: s.componentType,
        minQty: s.minQty,
        maxQty: s.maxQty,
      }))}
      slotTypes={slotTypes}
      typeNames={slotTypes.map((code) => ({ code, name: typeNames.get(code) ?? code }))}
      components={comps
        .filter((c) => slotTypes.includes(c.componentType))
        .map((c) => ({
          id: c.id,
          name: c.name,
          componentType: c.componentType,
          priceMinor: c.price,
          priceCurrency: c.priceCurrency,
          processingPriceMinor: c.processingPrice,
          processingPriceCurrency: c.processingPriceCurrency,
          processingDays: c.processingDays,
          stockQty: c.stockQty,
          isOrderable: c.isOrderable,
          deliveryDays: c.deliveryDays,
          photo: c.photo,
        }))}
      finance={finance}
      currencyCode={currency.code}
    />
  );
}
