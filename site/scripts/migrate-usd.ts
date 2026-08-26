import { eq } from "drizzle-orm";
import { db, sqlite } from "../lib/db";
import { categories, components, orders, products, settings } from "../drizzle/schema";
import { defaultFinance } from "../lib/currency";

// ============================================================
// Миграция цен рубль → USD-центы (plan-finances.md D-23).
// Запускать ОДИН раз на существующей БД. Свежие БД (seed.ts) уже
// сидятся в USD-центах — для них скрипт не нужен.
// Курс рубля на момент миграции: env MIGRATE_USD_RATE, по умолчанию 85.
// ============================================================

const UAH_RATE = Number(process.env.MIGRATE_USD_RATE ?? "44");

function toUsdCents(rubles: number): number {
  return Math.round((rubles * 100) / UAH_RATE);
}

const marker = db
  .select()
  .from(settings)
  .where(eq(settings.key, "finance.migratedToUsd"))
  .get();

if (marker) {
  console.log("Миграция уже выполнена (finance.migratedToUsd есть в Settings). Ничего не делаю.");
  sqlite.close();
  process.exit(0);
}

let changed = 0;

// Товары
const productRows = db.select().from(products).all();
for (const p of productRows) {
  const price = toUsdCents(p.price);
  if (price !== p.price) {
    db.update(products).set({ price }).where(eq(products.id, p.id)).run();
    changed += 1;
  }
}
console.log(`products.price: обработано ${productRows.length}`);

// Категории
const categoryRows = db.select().from(categories).all();
for (const c of categoryRows) {
  const workPrice = toUsdCents(c.workPrice);
  if (workPrice !== c.workPrice) {
    db.update(categories).set({ workPrice }).where(eq(categories.id, c.id)).run();
    changed += 1;
  }
}
console.log(`categories.workPrice: обработано ${categoryRows.length}`);

// Комплектующие
const componentRows = db.select().from(components).all();
for (const c of componentRows) {
  const price = toUsdCents(c.price);
  const processingPrice = toUsdCents(c.processingPrice);
  if (price !== c.price || processingPrice !== c.processingPrice) {
    db.update(components)
      .set({ price, processingPrice })
      .where(eq(components.id, c.id))
      .run();
    changed += 1;
  }
}
console.log(`components.price/processingPrice: обработано ${componentRows.length}`);

// Заявки: calcPrice конвертируем (Q-6); snapshot configJson — исторический факт, не трогаем
const orderRows = db.select().from(orders).all();
for (const o of orderRows) {
  const calcPrice = toUsdCents(o.calcPrice);
  if (calcPrice !== o.calcPrice) {
    db.update(orders).set({ calcPrice }).where(eq(orders.id, o.id)).run();
    changed += 1;
  }
}
console.log(`orders.calcPrice: обработано ${orderRows.length}`);

// finance.* настройки, если их ещё нет
function upsertSetting(key: string, value: string): void {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}

upsertSetting("finance.currencies", JSON.stringify(defaultFinance.currencies));
upsertSetting("finance.defaultCurrency", defaultFinance.defaultCurrency);
upsertSetting("finance.filterLow", String(defaultFinance.filterLow));
upsertSetting("finance.filterLowCurrency", defaultFinance.filterLowCurrency);
upsertSetting("finance.filterHigh", String(defaultFinance.filterHigh));
upsertSetting("finance.filterHighCurrency", defaultFinance.filterHighCurrency);
upsertSetting("finance.migratedToUsd", "1");

console.log(
  `Миграция завершена: ${changed} строк пересчитано по курсу ${UAH_RATE} ₽ за 1 $. ` +
    `finance.* записаны в Settings.`,
);
sqlite.close();