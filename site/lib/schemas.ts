import { z } from "zod";
import { PRODUCT_AVAILABILITY } from "@/drizzle/schema";

const nullableString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

// i18n-2: текст контента — либо legacy-строка (= RU), либо объект {ru?, en?, uk?}.
// Пока никуда не подключена (см. шаг 2 — миграция полей и подключение).
export const localizedStringSchema = z.union([
  z.string(),
  z.object({
    ru: z.string().optional(),
    en: z.string().optional(),
    uk: z.string().optional(),
  }),
]);

// Текстовое поле формы: legacy-строка (RU) или {ru?, en?, uk?}. RU — обязательно,
// EN/UK — опциональны. Пустые EN/UK не сохраняются (storeLS их пропускает).
function localizedText(required: boolean, requiredMsg: string) {
  const ru = required
    ? z.string().trim().min(1, requiredMsg)
    : z.string().trim().optional();
  return z.preprocess((v) => (typeof v === "string" ? { ru: v } : v), z.object({
    ru,
    en: z.string().trim().optional(),
    uk: z.string().trim().optional(),
  }));
}

// Название (RU обязательно).
export const localizedNameSchema = localizedText(true, "Укажите название");
// Описание (RU может быть пустым — например, описание категории).
export const localizedDescriptionSchema = localizedText(false, "Укажите описание");
// Описание товара (RU обязательно).
export const localizedProductDescriptionSchema = localizedText(true, "Укажите описание");
// SEO-поля: nullable + localized (D-i18n-2: ручной ввод хранится как введён).
export const localizedNullableString = z.preprocess((v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : { ru: t };
  }
  return v;
}, z.object({
  ru: z.string().trim().optional(),
  en: z.string().trim().optional(),
  uk: z.string().trim().optional(),
}).nullable());

// Товар: форма модалки (Основное/Фото/SEO) + D-13 (availability/reserveUntil/orderDays).
export const productSchema = z.object({
  name: localizedNameSchema,
  slug: z
    .string()
    .trim()
    .min(1, "Укажите slug")
    .regex(/^[a-z0-9-]+$/, "Slug: только латиница, цифры и дефис"),
  description: localizedProductDescriptionSchema,
  categoryId: z.number().int().positive(),
  price: z.number().int().min(0, "Цена не может быть отрицательной"),
  priceCurrency: z.string().regex(/^[A-Z]{3}$/, "Некорректный код валюты цены"),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  availability: z.enum(PRODUCT_AVAILABILITY),
  reserveUntil: z.union([z.string().datetime(), z.null()]).optional().default(null),
  orderDays: z.union([z.number().int().min(0), z.null()]).optional().default(null),
  images: z.array(z.string()).max(6, "Максимум 6 фото").default([]),
  metaTitle: localizedNullableString,
  metaDescription: localizedNullableString,
  ogImage: nullableString,
});

// Комплектующее: форма модалки склада.
// componentType — код из таблицы componentTypes; существование кода
// проверяется на сервере в API (см. isValidComponentTypeCode).
export const componentSchema = z.object({
  name: localizedNameSchema,
  componentType: z.string().trim().min(1, "Укажите тип комплектующего"),
  price: z.number().int().min(0, "Цена не может быть отрицательной"),
  priceCurrency: z.string().regex(/^[A-Z]{3}$/, "Некорректный код валюты цены"),
  processingPrice: z.number().int().min(0, "Обработка не может быть отрицательной"),
  processingPriceCurrency: z.string().regex(/^[A-Z]{3}$/, "Некорректный код валюты обработки"),
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
  name: localizedNameSchema,
  componentType: z.string().trim().min(1, "Укажите тип слота"),
  minQty: z.number().int().min(0, "Min не может быть отрицательным"),
  maxQty: z.number().int().min(0),
});

// Тип комплектующего: админский CRUD (план componentsExt).
// code — стабильный идентификатор; после создания не редактируется.
export const componentTypeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Укажите код типа")
    .regex(/^[a-z0-9-]+$/, "Код: только латиница, цифры и дефис"),
  name: localizedNameSchema,
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// Обновление: код менять нельзя (ломает ссылки из components/slotTemplates).
// Частичная схема БЕЗ default-ов: UI шлёт точечные правки (например, только
// переключение вкл/выкл), и отсутствующее поле не должно получать значение
// по умолчанию — иначе патч затирал бы sortOrder/isActive.
export const componentTypeUpdateSchema = componentTypeCreateSchema
  .omit({ code: true })
  .extend({
    name: z.string().trim().min(1, "Укажите название типа").optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  });

export type ComponentTypeCreateInput = z.infer<typeof componentTypeCreateSchema>;
export type ComponentTypeUpdateInput = z.infer<typeof componentTypeUpdateSchema>;

// Категория + слоты: редактор категории.
export const categorySchema = z.object({
  name: localizedNameSchema,
  slug: z
    .string()
    .trim()
    .min(1, "Укажите slug")
    .min(3, "Slug: минимум 3 символа")
    .regex(/^[a-z0-9-]+$/, "Slug: только латиница, цифры и дефис"),
  description: localizedDescriptionSchema,
  image: z.string().nullable().optional(),
  workPrice: z.number().int().min(0, "Работа не может быть отрицательной"),
  workPriceCurrency: z.string().regex(/^[A-Z]{3}$/, "Некорректный код валюты работы"),
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