import { z } from "zod";
import { COMPONENT_TYPES, PRODUCT_AVAILABILITY } from "@/drizzle/schema";

const nullableString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

// Товар: форма модалки (Основное/Фото/SEO) + D-13 (availability/reserveUntil/orderDays).
export const productSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  slug: z
    .string()
    .trim()
    .min(1, "Укажите slug")
    .regex(/^[a-z0-9-]+$/, "Slug: только латиница, цифры и дефис"),
  description: z.string().trim().min(1, "Укажите описание"),
  categoryId: z.number().int().positive(),
  price: z.number().int().min(0, "Цена не может быть отрицательной"),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  availability: z.enum(PRODUCT_AVAILABILITY),
  reserveUntil: z.union([z.string().datetime(), z.null()]).optional().default(null),
  orderDays: z.union([z.number().int().min(0), z.null()]).optional().default(null),
  images: z.array(z.string()).max(6, "Максимум 6 фото").default([]),
  metaTitle: nullableString,
  metaDescription: nullableString,
  ogImage: nullableString,
});

// Комплектующее: форма модалки склада.
export const componentSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  componentType: z.enum(COMPONENT_TYPES),
  price: z.number().int().min(0, "Цена не может быть отрицательной"),
  processingPrice: z.number().int().min(0, "Обработка не может быть отрицательной"),
  processingDays: z.number().int().min(0),
  stockQty: z.number().int().min(0),
  isOrderable: z.boolean(),
  isActive: z.boolean(),
  deliveryDays: z.union([z.number().int().min(0), z.null()]).optional().default(null),
  photo: z.string().min(1, "Загрузите фото для коллажа"),
});

// Слот шаблона (для PUT категории).
export const slotSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, "Укажите название слота"),
  componentType: z.enum(COMPONENT_TYPES),
  minQty: z.number().int().min(0, "Min не может быть отрицательным"),
  maxQty: z.number().int().min(0),
});

// Категория + слоты: редактор категории.
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  slug: z
    .string()
    .trim()
    .min(1, "Укажите slug")
    .regex(/^[a-z0-9-]+$/, "Slug: только латиница, цифры и дефис"),
  description: z.string().trim(),
  workPrice: z.number().int().min(0, "Работа не может быть отрицательной"),
  baseWorkDays: z.number().int().min(0),
  isActive: z.boolean(),
  hasSlotTemplate: z.boolean(),
  slots: z.array(slotSchema).default([]),
});

// Статус заявки (PUT /api/admin/orders/[id]).
export const orderStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "done", "cancelled"]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ComponentInput = z.infer<typeof componentSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;