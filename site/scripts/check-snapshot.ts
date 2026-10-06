import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db, sqlite } from "../lib/db";
import {
  blogPosts,
  blogTags,
  categories,
  components,
  orders,
  products,
  slotTemplates,
} from "../drizzle/schema";
import { getSettings } from "../lib/get-settings";
import { extractImagePaths } from "../lib/markdown-utils";
import { firstLocale, splitLocalized } from "../lib/localize";

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

// Текст записи — LocalizedString в JSON: проверяем КАЖДУЮ локаль, а не только RU.
function* localizedTexts(value: string): Generator<[string, string]> {
  for (const [locale, text] of Object.entries(splitLocalized(value))) {
    if (typeof text === "string" && text.length > 0) yield [locale, text];
  }
}

// Внешняя картинка в тексте записи: markdown-картинка с http(s) либо путь
// /uploads/ внутри внешнего адреса (файла такого нет в архиве снапшота).
// Обычные ссылки на сторонние сайты текстом не считаются (D-B12).
const EXTERNAL_MD_IMAGE = /!\[[^\]]*\]\(\s*<?https?:\/\/[^\s)>]+/g;
const EXTERNAL_UPLOADS_URL = /https?:\/\/[^\s"'()<>\]]*\/uploads\//g;

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
// Записи блога и рубрики — направление 5 (plan5stage-blog-3.md, пункт 3.4).
const allPosts = db.select().from(blogPosts).all();
const allTags = db.select().from(blogTags).all();

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

// --- Записи блога: обложка и картинки внутри markdown ---
// Обложка может быть null (запись без обложки) — битой считается несуществующий файл.
const badCovers = allPosts.filter((p) => p.coverImage !== null && !uploadFileExists(p.coverImage));
assert(
  badCovers.length === 0,
  `все blogPosts.coverImage (не null) — существующие файлы${badCovers.length ? ` (битые: ${badCovers.map((p) => `${p.slug}: ${p.coverImage}`).slice(0, 5).join("; ")}${badCovers.length > 5 ? " …" : ""})` : ""}`,
);

const badInlineImages: string[] = [];
for (const post of allPosts) {
  for (const [locale, text] of localizedTexts(post.content)) {
    for (const src of extractImagePaths(text)) {
      if (!uploadFileExists(src)) badInlineImages.push(`${post.slug} [${locale}]: ${src}`);
    }
  }
}
assert(
  badInlineImages.length === 0,
  `все картинки из текстов записей — существующие файлы${badInlineImages.length ? ` (битые: ${badInlineImages.slice(0, 5).join("; ")}${badInlineImages.length > 5 ? " …" : ""})` : ""}`,
);

const externalRefs = [
  ...allProducts.flatMap((p) => p.images),
  ...allComponents.map((c) => c.photo),
  ...allCategories.map((c) => c.image).filter((i): i is string => i !== null),
  ...collages.map((o) => o.collagePath!),
  ...allPosts.map((p) => p.coverImage).filter((i): i is string => i !== null),
].filter((r) => r.startsWith("http://") || r.startsWith("https://"));
assert(externalRefs.length === 0, `ни одно изображение не внешний URL (http/https)${externalRefs.length ? ` (найдены: ${externalRefs.slice(0, 3).join("; ")})` : ""}`);

const externalInPosts: string[] = [];
for (const post of allPosts) {
  for (const [locale, text] of localizedTexts(post.content)) {
    for (const match of text.matchAll(EXTERNAL_MD_IMAGE)) {
      externalInPosts.push(`${post.slug} [${locale}]: ${match[0]}`);
    }
    for (const match of text.matchAll(EXTERNAL_UPLOADS_URL)) {
      externalInPosts.push(`${post.slug} [${locale}]: ${match[0]}`);
    }
  }
}
assert(
  externalInPosts.length === 0,
  `в текстах записей нет внешних картинок (http/https)${externalInPosts.length ? ` (найдены: ${externalInPosts.slice(0, 3).join("; ")})` : ""}`,
);

console.log("--- Счётчики ---");
const allSlots = db.select().from(slotTemplates).all();
console.log(`категорий: ${allCategories.length}`);
console.log(`слотов: ${allSlots.length}`);
console.log(`комплектующих: ${allComponents.length}`);
console.log(`товаров: ${allProducts.length}`);
console.log(`заявок: ${allOrders.length}`);
console.log(`записей блога: ${allPosts.length}`);
console.log(`рубрик блога: ${allTags.length}`);
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
assert(firstLocale(s.contacts.address).trim() !== "", `contacts.address не пуст (${firstLocale(s.contacts.address)})`);
assert(s.contacts.hours.length > 0 && s.contacts.hours.some((h) => firstLocale(h.value).trim() !== ""), "contacts.hours не пуст");
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
// uploads/blog появляется вместе с первой загрузкой картинки записи (kind="blog"),
// поэтому до первой загрузки каталога нет — это не ошибка снапшота.
if (existsSync(resolve(process.cwd(), "public", "uploads", "blog"))) {
  assert(true, "public/uploads/blog/ существует");
} else {
  console.log("WARN public/uploads/blog/ нет — картинки записей ещё не загружались (не FAIL)");
}

console.log("Проверка снапшот-состояния завершена.");
sqlite.close();
