import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { db, sqlite } from "../lib/db";
import {
  categories,
  components,
  products,
  settings,
  slotTemplates,
} from "../drizzle/schema";
import { getSettings } from "../lib/get-settings";

function assert(condition: boolean, label: string) {
  console.log(`${condition ? "OK " : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
}

const allCategories = db.select().from(categories).orderBy(categories.sortOrder).all();
const allSlots = db.select().from(slotTemplates).all();
const allComponents = db.select().from(components).orderBy(components.id).all();
const allProducts = db.select().from(products).orderBy(products.id).all();
const allSettings = db.select().from(settings).all();

console.log("--- Счётчики ---");
console.log(`категорий: ${allCategories.length}`);
console.log(`слотов: ${allSlots.length}`);
for (const c of allCategories) {
  const n = allSlots.filter((s) => s.categoryId === c.id).length;
  console.log(`  ${c.slug}: ${n} слотов`);
}
console.log(`комплектующих: ${allComponents.length}`);
console.log(`товаров: ${allProducts.length}`);
console.log(`ключей settings: ${allSettings.length}: ${allSettings.map((s) => s.key).join(", ")}`);

console.log("--- Сверка с макетом (D-11) ---");

const kulony = allCategories.find((c) => c.slug === "kulony");
assert(!!kulony && kulony.workPrice === 1000, "Кулоны workPrice = 1000");
assert(!!kulony && kulony.baseWorkDays === 3, "Кулоны baseWorkDays = 3");
assert(!!kulony && kulony.hasSlotTemplate === true, "Кулоны hasSlotTemplate = true");

const vintazh = allCategories.find((c) => c.slug === "vintazhnyj-remont");
assert(!!vintazh && vintazh.hasSlotTemplate === false, "Винтажный ремонт без шаблона слотов");
assert(
  !allSlots.some((s) => s.categoryId === vintazh?.id),
  "У Винтажного ремонта 0 слотов",
);

const telegramma = allProducts.find((p) => p.slug === "kulon-telegramma");
assert(
  !!telegramma && telegramma.isNew && telegramma.isFeatured && telegramma.availability === "reserve" && !!telegramma.reserveUntil,
  "Телеграмма: new + featured + reserve (с reserveUntil)",
);

const vecher = allProducts.find((p) => p.slug === "komplekt-vecher-na-radishcheva");
assert(
  !!vecher && vecher.isFeatured && vecher.availability === "made_to_order" && vecher.orderDays === 10,
  "Вечер на Радищева: featured + made_to_order с orderDays = 10",
);

const romashkova = allProducts.find((p) => p.slug === "brosh-romashkovaya");
assert(
  !!romashkova && romashkova.isFeatured && romashkova.availability === "in_stock" && !romashkova.isNew,
  "Ромашковая: featured, in_stock, не новинка",
);

const orderable = allComponents.filter((c) => c.isOrderable);
assert(orderable.length === 5, `комплектующих «под заказ»: 5 (найдено ${orderable.length})`);
const expectedDelivery = [10, 14, 7, 9, 18];
assert(
  orderable.every((c, i) => c.deliveryDays === expectedDelivery[i]),
  `deliveryDays под заказ = ${orderable.map((c) => c.deliveryDays).join("/")}`,
);
assert(
  orderable.every((c) => c.stockQty === 0),
  "у всех «под заказ» остаток 0",
);

console.log("--- Фото комплектующих ---");
const componentsDir = resolve(process.cwd(), "public", "uploads", "components");
let svgFiles: string[] = [];
try {
  svgFiles = readdirSync(componentsDir).filter((f) => f.endsWith(".svg"));
} catch {
  /* пусто */
}
console.log(`SVG-файлов в public/uploads/components/: ${svgFiles.length}`);
assert(svgFiles.length === 25, "25 SVG-файлов на месте");
assert(
  allComponents.every((c) => svgFiles.includes(c.photo.replace("/uploads/components/", ""))),
  "каждый photo указывает на существующий файл",
);
console.log(allComponents.map((c) => c.photo).join("\n"));

console.log("--- Settings из БД ---");
const siteSettings = getSettings();
console.log(`phone: ${siteSettings.contacts.phone}`);
console.log(`email: ${siteSettings.contacts.email}`);
console.log(`address: ${siteSettings.contacts.address}`);
console.log(`hours[1]: ${siteSettings.contacts.hours[1].day} — ${siteSettings.contacts.hours[1].value}`);
assert(siteSettings.contacts.phone === "+38 095 358 48 11", "phone из БД = +38 095 358 48 11");
assert(
  siteSettings.contacts.hours.length === 4 && siteSettings.contacts.hours[0].value === "выходной",
  "часы: 4 строки, Пн — выходной",
);
assert(
  siteSettings.about.short.rows.length === 7,
  `about.short: ${siteSettings.about.short.rows.length} строк`,
);
assert(
  siteSettings.about.history.rows.length === 13,
  `about.history: ${siteSettings.about.history.rows.length} строк`,
);
assert(
  siteSettings.about.principles.length === 4,
  `about.principles: ${siteSettings.about.principles.length} карточки`,
);

console.log("--- Сэмплы товаров ---");
for (const p of allProducts) {
  const cat = allCategories.find((c) => c.id === p.categoryId);
  console.log(`  ${p.slug} [${cat?.slug}] ${p.price} ₽ · ${p.availability}${p.orderDays ? ` · ${p.orderDays} дн` : ""}${p.isNew ? " · NEW" : ""}${p.isFeatured ? " · FEAT" : ""}`);
}

console.log("Проверка завершена.");
sqlite.close();
