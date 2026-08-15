import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const COMPONENT_TYPES = ["stone", "pendant", "bead", "cord", "clasp", "base"] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

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
  baseWorkDays: integer("baseWorkDays").notNull(),
  hasSlotTemplate: integer("hasSlotTemplate", { mode: "boolean" }).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull(),
  sortOrder: integer("sortOrder").notNull(),
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
  processingPrice: integer("processingPrice").notNull(),
  processingDays: integer("processingDays").notNull(),
  stockQty: integer("stockQty").notNull(),
  isOrderable: integer("isOrderable", { mode: "boolean" }).notNull(),
  deliveryDays: integer("deliveryDays"),
  photo: text("photo").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<OrderType>().notNull(),
  customerName: text("customerName").notNull(),
  contact: text("contact").notNull(),
  message: text("message").notNull(),
  productId: integer("productId").references(() => products.id),
  configJson: text("configJson").notNull(),
  collagePath: text("collagePath"),
  calcPrice: integer("calcPrice").notNull(),
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

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
