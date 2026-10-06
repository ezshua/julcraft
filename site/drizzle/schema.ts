import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// i18n-2: текстовые поля контента (categories.name/description, products.name/
// description/metaTitle/metaDescription, components.name и т.п.) готовятся к
// хранению JSON (LocalizedString {ru,en,uk}). Сейчас поля остаются text();
// миграция mode="json" + конвертация legacy-строк — в шаге 2.

// DEPRECATED как источник истины: оставлен только как fallback при пустой
// таблице componentTypes (см. lib/component-types.ts). Редактируемый список
// типов живёт в БД (админка → Категории → вкладка «Типы компонентов»).
export const COMPONENT_TYPES = ["stone", "pendant", "bead", "cord", "clasp", "base"] as const;
// Строковый псевдо-тип: код типа хранится в components.componentType /
// slotTemplates.componentType и может быть любым кодом из таблицы componentTypes.
export type ComponentType = string;

export const PRODUCT_AVAILABILITY = ["in_stock", "reserve", "made_to_order", "out_of_stock"] as const;
export type ProductAvailability = (typeof PRODUCT_AVAILABILITY)[number];

export const ORDER_TYPES = ["product", "custom", "contact"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = ["new", "in_progress", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  image: text("image"),
  workPrice: integer("workPrice").notNull(),
  workPriceCurrency: text("workPriceCurrency").notNull().default("USD"),
  baseWorkDays: integer("baseWorkDays").notNull(),
  hasSlotTemplate: integer("hasSlotTemplate", { mode: "boolean" }).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull(),
  sortOrder: integer("sortOrder").notNull(),
});

// Редактируемые типы комплектующих (план componentsExt): code — стабильный
// идентификатор (менять нельзя, на него ссылаются components/slotTemplates),
// name — человекочитаемая подпись.
export const componentTypes = sqliteTable("componentTypes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
});

export const slotTemplates = sqliteTable("slotTemplates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("categoryId")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  componentType: text("componentType").$type<ComponentType>().notNull(),
  minQty: integer("minQty").notNull(),
  maxQty: integer("maxQty").notNull(),
  sortOrder: integer("sortOrder").notNull(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("categoryId")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  priceCurrency: text("priceCurrency").notNull().default("USD"),
  images: text("images", { mode: "json" }).$type<string[]>().notNull(),
  materials: text("materials", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  specs: text("specs", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  isNew: integer("isNew", { mode: "boolean" }).notNull(),
  isFeatured: integer("isFeatured", { mode: "boolean" }).notNull(),
  availability: text("availability").$type<ProductAvailability>().notNull(),
  reserveUntil: integer("reserveUntil", { mode: "timestamp" }),
  orderDays: integer("orderDays"),
  metaTitle: text("metaTitle"),
  metaDescription: text("metaDescription"),
  ogImage: text("ogImage"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const components = sqliteTable("components", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  componentType: text("componentType").$type<ComponentType>().notNull(),
  price: integer("price").notNull(),
  priceCurrency: text("priceCurrency").notNull().default("USD"),
  processingPrice: integer("processingPrice").notNull(),
  processingPriceCurrency: text("processingPriceCurrency").notNull().default("USD"),
  processingDays: integer("processingDays").notNull(),
  stockQty: integer("stockQty").notNull(),
  isOrderable: integer("isOrderable", { mode: "boolean" }).notNull(),
  deliveryDays: integer("deliveryDays"),
  photo: text("photo").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull(),
});

// Направление 5 — блог мастера (plan-5-blog.md §4).
// Статусы только draft/published: отложенной публикации в v1 нет (решение B6),
// а «запланированность» вычисляется из publishedAt > now.
// Черновик не должен попадать на витрину — за это отвечает lib/blog.ts
// (PUBLISHED_FILTER), прямых выборок blogPosts в публичных страницах нет.
export const BLOG_POST_STATUSES = ["draft", "published"] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export const blogPosts = sqliteTable(
  "blogPosts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),                 // LocalizedString (JSON {ru,en,uk})
    excerpt: text("excerpt").notNull().default(""),  // LocalizedString
    content: text("content").notNull().default(""),  // LocalizedString, markdown
    coverImage: text("coverImage"),                  // "/uploads/blog/…" | null
    status: text("status").$type<BlogPostStatus>().notNull().default("draft"),
    publishedAt: integer("publishedAt", { mode: "timestamp" }),
    metaTitle: text("metaTitle"),                    // LocalizedString | null
    metaDescription: text("metaDescription"),        // LocalizedString | null
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  // Сортировка витрины «свежие сверху» + фильтр по статусу — под этот индекс.
  (t) => [index("blogPosts_status_publishedAt_idx").on(t.status, t.publishedAt)],
);

// Рубрики (теги) блога. slug — стабильный идентификатор, после создания
// не меняется (как code у componentTypes); название локализовано.
export const blogTags = sqliteTable("blogTags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),                      // LocalizedString
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
});

// Связь запись ↔ рубрика. ON DELETE CASCADE здесь НЕ используется:
// better-sqlite3 не включает PRAGMA foreign_keys, поэтому каскад не сработает —
// связи чистим в коде (setPostTags и обработчики удаления).
export const blogPostTags = sqliteTable(
  "blogPostTags",
  {
    postId: integer("postId").notNull().references(() => blogPosts.id),
    tagId: integer("tagId").notNull().references(() => blogTags.id),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<OrderType>().notNull(),
  customerName: text("customerName").notNull(),
  contact: text("contact").notNull(),
  message: text("message").notNull(),
  productId: integer("productId").references(() => products.id),
  configJson: text("configJson").notNull(),
  collagePath: text("collagePath"),
  // Иллюстрация к сообщению из формы обратной связи (п. 6c: фото необязательно).
  photoPath: text("photoPath"),
  calcPrice: integer("calcPrice").notNull(),
  calcPriceCurrency: text("calcPriceCurrency").notNull().default("USD"),
  calcDays: integer("calcDays").notNull(),
  status: text("status").$type<OrderStatus>().notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type ComponentTypeRow = typeof componentTypes.$inferSelect;
export type NewComponentType = typeof componentTypes.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type SlotTemplate = typeof slotTemplates.$inferSelect;
export type NewSlotTemplate = typeof slotTemplates.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Component = typeof components.$inferSelect;
export type NewComponent = typeof components.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
