import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { db, sqlite } from "../lib/db";
import {
  blogPostTags,
  blogPosts,
  blogTags,
  categories,
  components,
  products,
  settings,
  slotTemplates,
} from "../drizzle/schema";
import { getPublishedPosts } from "../lib/blog";
import { getSettings } from "../lib/get-settings";
import { firstLocale } from "../lib/localize";

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
// 1000 ₴ — в БД v2 хранится как миноры исходной валюты + маркер "UAH"
assert(!!kulony && kulony.workPrice === 1000 * 100 && kulony.workPriceCurrency === "UAH", "Кулоны workPrice = 1000 ₽ (100000 minor, UAH)");
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

console.log("--- Фото товаров ---");
const productsDir = resolve(process.cwd(), "public", "uploads", "products");
let productFiles: string[] = [];
try {
  productFiles = readdirSync(productsDir).filter((f) => f.endsWith(".jpg"));
} catch {
  /* пусто */
}
console.log(`фото в public/uploads/products/: ${productFiles.length}`);
assert(
  allProducts.length > 0 &&
    allProducts.every((p) =>
      p.images.every((src) => {
        const file = src.replace("/uploads/products/", "");
        return src.startsWith("/uploads/products/") && productFiles.includes(file);
      }),
    ),
  "все images товаров — локальные пути /uploads/products/ на существующие файлы",
);

console.log("--- Settings из БД ---");
const siteSettings = getSettings();
console.log(`phone: ${siteSettings.contacts.phone}`);
console.log(`email: ${siteSettings.contacts.email}`);
console.log(`address: ${firstLocale(siteSettings.contacts.address)}`);
console.log(`hours[1]: ${firstLocale(siteSettings.contacts.hours[1].day)} — ${firstLocale(siteSettings.contacts.hours[1].value)}`);
assert(siteSettings.contacts.phone === "+38 095 358 48 11", "phone из БД = +38 095 358 48 11");
assert(
  siteSettings.contacts.hours.length === 4 && firstLocale(siteSettings.contacts.hours[0].value) === "выходной",
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
   console.log(`  ${p.slug} [${cat?.slug}] ${(p.price / 100).toFixed(2)} ${p.priceCurrency} · ${p.availability}${p.orderDays ? ` · ${p.orderDays} дн` : ""}${p.isNew ? " · NEW" : ""}${p.isFeatured ? " · FEAT" : ""}`);
}

console.log("--- Записи блога ---");
const allPosts = db.select().from(blogPosts).all();
const allTags = db.select().from(blogTags).orderBy(blogTags.sortOrder).all();
const allPostTags = db.select().from(blogPostTags).all();
console.log(`записей блога: ${allPosts.length}`);
console.log(`рубрик блога: ${allTags.length}`);
console.log(`связей запись↔рубрика: ${allPostTags.length}`);
for (const tag of allTags) {
  const n = allPostTags.filter((l) => l.tagId === tag.id).length;
  console.log(`  ${tag.slug}: ${n} записей`);
}

assert(allTags.length === 3, `рубрик блога: 3 (найдено ${allTags.length})`);
assert(allPosts.length === 5, `записей блога: 5 (найдено ${allPosts.length})`);

// Черновик есть в базе, но витрина его не отдаёт (D-B2/D-B3).
const drafts = allPosts.filter((p) => p.status === "draft");
assert(drafts.length === 1, "в базе ровно один черновик");
const publishedList = getPublishedPosts({ perPage: 50 });
console.log(`опубликованных на витрине: ${publishedList.total}`);
assert(
  publishedList.total === allPosts.length - drafts.length,
  "getPublishedPosts() отдаёт только опубликованные",
);
assert(
  drafts.every((d) => !publishedList.posts.some((p) => p.id === d.id)),
  "черновика нет в списке витрины",
);
assert(
  publishedList.posts.every((p) => p.publishedAt !== null),
  "у всех опубликованных записей есть дата публикации",
);

// Группы по датам: записи разложились по месяцам.
console.log(
  publishedList.groups.map((g) => `${g.month}/${g.year}: ${g.posts.length}`).join(", "),
);
assert(publishedList.groups.length >= 2, "записи разложены минимум по двум месяцам");

// Связи blogPostTags целы: каждая указывает на существующие запись и рубрику.
const postIds = new Set(allPosts.map((p) => p.id));
const tagIds = new Set(allTags.map((t) => t.id));
assert(
  allPostTags.every((l) => postIds.has(l.postId) && tagIds.has(l.tagId)),
  "все связи запись↔рубрика указывают на существующие строки",
);
const taggedPosts = allPostTags.map((l) => l.postId);
assert(new Set(taggedPosts).size === taggedPosts.length, "дублей связей нет");
for (const tag of allTags) {
  const postsWithTag = allPosts.filter((p) => allPostTags.some((l) => l.tagId === tag.id && l.postId === p.id));
  console.log(`  ${tag.slug}: ${postsWithTag.map((p) => p.slug).join(", ")}`);
}

// Обложки — существующие файлы (демо берёт фото товаров).
console.log("--- Обложки блога ---");
for (const p of allPosts) {
  if (p.coverImage === null) {
    console.log(`  ${p.slug}: без обложки`);
    continue;
  }
  console.log(`  ${p.slug}: ${p.coverImage}`);
}
assert(
  allPosts
    .filter((p) => p.coverImage !== null)
    .every((p) => existsSync(resolve(process.cwd(), "public", p.coverImage!.slice(1)))),
  "все coverImage — существующие файлы",
);
assert(
  allPosts.filter((p) => p.coverImage === null).length === 1,
  "ровно одна запись без обложки (плейсхолдер на витрине)",
);

// EN/UK есть минимум у двух записей — остальные проверяют фолбэк RU.
const withEn = allPosts.filter((p) => p.title.includes('"en"'));
const withUk = allPosts.filter((p) => p.title.includes('"uk"'));
console.log(`записей с EN: ${withEn.length}, с UK: ${withUk.length}`);
assert(withEn.length >= 2 && withUk.length >= 2, "EN и UK заполнены минимум у двух записей");

console.log("--- Сэмплы записей блога ---");
for (const p of allPosts) {
  const tags = allPostTags
    .filter((l) => l.postId === p.id)
    .map((l) => allTags.find((t) => t.id === l.tagId)?.slug)
    .filter(Boolean)
    .join(" + ");
  console.log(
    `  ${p.slug} [${p.status}]${p.publishedAt ? " · " + p.publishedAt.toISOString().slice(0, 10) : ""}${tags ? " · " + tags : ""}`,
  );
}

console.log("Проверка завершена.");
sqlite.close();
