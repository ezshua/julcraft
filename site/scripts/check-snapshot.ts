import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db, sqlite } from "../lib/db";
import {
  categories,
  components,
  orders,
  products,
  slotTemplates,
} from "../drizzle/schema";
import { getSettings } from "../lib/get-settings";

// ============================================================
// snapshot:check (plan-snapshot.md Шаг 3)
// Проверка ЦЕЛОСТНОСТИ снапшот-состояния (боевое состояние,
// восстановленное через snapshot:restore) — не сверка с макетом:
// сверка демо-сида с макетом остаётся за db:check / check-seed.ts
// (решение №3).
// ============================================================

function assert(condition: boolean, label: string) {
  console.log(`${condition ? "OK " : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
}

function uploadFileExists(ref: string): boolean {
  if (!ref.startsWith("/uploads/")) return false;
  return existsSync(resolve(process.cwd(), "public", ref.slice(1)));
}

console.log("--- SQLite ---");
const integrity = sqlite.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
assert(integrity.integrity_check === "ok", "PRAGMA integrity_check = ok");
const fk = sqlite.prepare("PRAGMA foreign_key_check").all();
assert(Array.isArray(fk) && fk.length === 0, "PRAGMA foreign_key_check — без нарушений");

console.log("--- Ссылки на файлы изображений ---");
const allCategories = db.select().from(categories).all();
const allComponents = db.select().from(components).all();
const allProducts = db.select().from(products).all();
const allOrders = db.select().from(orders).all();

const badProductImages: string[] = [];
for (const p of allProducts) {
  for (const src of p.images) {
    if (!src.startsWith("/uploads/") || !uploadFileExists(src)) {
      badProductImages.push(`${p.slug}: ${src}`);
    }
  }
}
assert(
  badProductImages.length === 0,
  `все products.images[] — локальные пути /uploads/… на существующие файлы${badProductImages.length ? ` (битые: ${badProductImages.slice(0, 5).join("; ")}${badProductImages.length > 5 ? " …" : ""})` : ""}`,
);

const badComponentPhotos = allComponents.filter((c) => !uploadFileExists(c.photo));
assert(
  badComponentPhotos.length === 0,
  `все components.photo — существующие файлы${badComponentPhotos.length ? ` (битые: ${badComponentPhotos.map((c) => c.photo).slice(0, 5).join("; ")})` : ""}`,
);

const badCategoryImages = allCategories.filter((c) => c.image === null || !uploadFileExists(c.image));
assert(
  badCategoryImages.length === 0,
  `все categories.image не null и указывают на существующие файлы${badCategoryImages.length ? ` (битые: ${badCategoryImages.map((c) => c.slug).join(", ")})` : ""}`,
);

const collages = allOrders.filter((o) => o.collagePath !== null);
assert(
  collages.every((o) => uploadFileExists(o.collagePath!)),
  `все orders.collagePath (не null, ${collages.length} шт.) — существующие файлы`,
);

const externalRefs = [
  ...allProducts.flatMap((p) => p.images),
  ...allComponents.map((c) => c.photo),
  ...allCategories.map((c) => c.image).filter((i): i is string => i !== null),
  ...collages.map((o) => o.collagePath!),
].filter((r) => r.startsWith("http://") || r.startsWith("https://"));
assert(externalRefs.length === 0, `ни одно изображение не внешний URL (http/https)${externalRefs.length ? ` (найдены: ${externalRefs.slice(0, 3).join("; ")})` : ""}`);

console.log("--- Счётчики ---");
const allSlots = db.select().from(slotTemplates).all();
console.log(`категорий: ${allCategories.length}`);
console.log(`слотов: ${allSlots.length}`);
console.log(`комплектующих: ${allComponents.length}`);
console.log(`товаров: ${allProducts.length}`);
console.log(`заявок: ${allOrders.length}`);
assert(allCategories.length > 0, "категорий > 0");
assert(allProducts.length > 0, "товаров > 0");
assert(allComponents.length > 0, "комплектующих > 0");
assert(allOrders.length > 0, "заявок > 0");

const catsWithSlots = allCategories.filter((c) => c.hasSlotTemplate);
const catsWithoutSlots = catsWithSlots
  .filter((c) => !allSlots.some((s) => s.categoryId === c.id))
  .map((c) => c.slug);
assert(
  catsWithoutSlots.length === 0,
  `у всех категорий с hasSlotTemplate есть слоты${catsWithoutSlots.length ? ` (без слотов: ${catsWithoutSlots.join(", ")})` : ""}`,
);

console.log("--- Цены ---");
const badPriceProducts = allProducts.filter((p) => p.price <= 0);
assert(
  badPriceProducts.length === 0,
  `у всех товаров price > 0${badPriceProducts.length ? ` (нарушители: ${badPriceProducts.map((p) => p.slug).join(", ")})` : ""}`,
);
const badPriceComponents = allComponents.filter((c) => c.price <= 0);
assert(
  badPriceComponents.length === 0,
  `у всех комплектующих price > 0${badPriceComponents.length ? ` (нарушители: id=${badPriceComponents.map((c) => c.id).join(", ")})` : ""}`,
);

console.log("--- Settings ---");
const s = getSettings();
assert(s.contacts.phone.trim() !== "", `contacts.phone не пуст (${s.contacts.phone})`);
assert(s.contacts.email.trim() !== "", `contacts.email не пуст (${s.contacts.email})`);
assert(s.contacts.address.trim() !== "", `contacts.address не пуст (${s.contacts.address})`);
assert(s.contacts.hours.length > 0 && s.contacts.hours.some((h) => h.value.trim() !== ""), "contacts.hours не пуст");
assert(s.about.short.rows.length > 0, "about.short не пуст");
assert(s.about.history.rows.length > 0, "about.history не пуст");
assert(s.about.principles.length > 0, "about.principles не пуст");
if (!s.telegram.botToken || !s.telegram.chatId) {
  console.log("WARN telegram.botToken/chatId пусты — уведомления о заявках работать не будут (не FAIL)");
}

console.log("--- Каталог uploads ---");
assert(
  existsSync(resolve(process.cwd(), "public", "uploads", "about-workshop.jpg")),
  "public/uploads/about-workshop.jpg на месте",
);
for (const dir of ["products", "components", "categories", "collages"]) {
  assert(existsSync(resolve(process.cwd(), "public", "uploads", dir)), `public/uploads/${dir}/ существует`);
}

console.log("Проверка снапшот-состояния завершена.");
sqlite.close();
