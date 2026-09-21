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
// requiredMsg приходит из словаря (admin.errors.hintName и т.п.) — сообщения
// валидации локализуемы (i18n-4, задача А), чтобы RU-админка не показывала
// английские ошибки.
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

// Название (RU обязательно). Фабрика: сообщение берётся из словаря по локали.
// errors — срез admin.errors (TS не проверяет ключи строго, чтобы разные
// схемы могли принимать один и тот же dict.admin.errors).
export function localizedNameSchema(errors: Record<string, string>) {
  return localizedText(true, errors.hintName);
}
// Описание (RU может быть пустым — например, описание категории).
export function localizedDescriptionSchema(errors: Record<string, string>) {
  return localizedText(false, errors.hintDescription);
}
// Описание товара (RU обязательно).
export function localizedProductDescriptionSchema(errors: Record<string, string>) {
  return localizedText(true, errors.hintDescription);
}
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
// Схемы — фабрики: сообщения валидации берутся из словаря по локали (i18n-4, задача А).
export function productSchema(errors: Record<string, string>) {
  return z.object({
    name: localizedNameSchema(errors),
    slug: z
      .string()
      .trim()
      .min(1, errors.hintSlug)
      .regex(/^[a-z0-9-]+$/, errors.hintSlugFormat),
    description: localizedProductDescriptionSchema(errors),
    categoryId: z.number().int().positive(),
    price: z.number().int().min(0, errors.hintPriceNeg),
    priceCurrency: z.string().regex(/^[A-Z]{3}$/, errors.hintPriceCurrency),
    isNew: z.boolean(),
    isFeatured: z.boolean(),
    availability: z.enum(PRODUCT_AVAILABILITY),
    reserveUntil: z.union([z.string().datetime(), z.null()]).optional().default(null),
    orderDays: z.union([z.number().int().min(0), z.null()]).optional().default(null),
    images: z.array(z.string()).max(6, errors.hintMaxPhotos).default([]),
    metaTitle: localizedNullableString,
    metaDescription: localizedNullableString,
    ogImage: nullableString,
  });
}

// Комплектующее: форма модалки склада.
// componentType — код из таблицы componentTypes; существование кода
// проверяется на сервере в API (см. isValidComponentTypeCode).
export function componentSchema(errors: Record<string, string>) {
  return z.object({
    name: localizedNameSchema(errors),
    componentType: z.string().trim().min(1, errors.hintComponentType),
    price: z.number().int().min(0, errors.hintPriceNeg),
    priceCurrency: z.string().regex(/^[A-Z]{3}$/, errors.hintPriceCurrency),
    processingPrice: z.number().int().min(0, errors.hintProcessingPriceNeg),
    processingPriceCurrency: z.string().regex(/^[A-Z]{3}$/, errors.hintProcessingCurrency),
    processingDays: z.number().int().min(0),
    stockQty: z.number().int().min(0),
    isOrderable: z.boolean(),
    isActive: z.boolean(),
    deliveryDays: z.union([z.number().int().min(0), z.null()]).optional().default(null),
    photo: z.string().min(1, errors.hintPhoto),
  });
}

// Слот шаблона (для PUT категории).
export function slotSchema(errors: Record<string, string>) {
  return z.object({
    id: z.number().int().positive().nullable().optional(),
    name: localizedNameSchema(errors),
    componentType: z.string().trim().min(1, errors.hintSlotType),
    minQty: z.number().int().min(0, errors.hintMinQty),
    maxQty: z.number().int().min(0),
  });
}

// Тип комплектующего: админский CRUD (план componentsExt).
// code — стабильный идентификатор; после создания не редактируется.
export function componentTypeCreateSchema(errors: Record<string, string>) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, errors.hintTypeCode)
      .regex(/^[a-z0-9-]+$/, errors.hintCodeFormat),
    name: localizedNameSchema(errors),
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  });
}

// Обновление: код менять нельзя (ломает ссылки из components/slotTemplates).
// Частичная схема БЕЗ default-ов: UI шлёт точечные правки (например, только
// переключение вкл/выкл), и отсутствующее поле не должно получать значение
// по умолчанию — иначе патч затирал бы sortOrder/isActive.
export function componentTypeUpdateSchema(errors: Record<string, string>) {
  return componentTypeCreateSchema(errors)
    .omit({ code: true })
    .extend({
      name: z.string().trim().min(1, errors.hintTypeName).optional(),
      sortOrder: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });
}

export type ComponentTypeCreateInput = z.infer<ReturnType<typeof componentTypeCreateSchema>>;
export type ComponentTypeUpdateInput = z.infer<ReturnType<typeof componentTypeUpdateSchema>>;

// Категория + слоты: редактор категории.
export function categorySchema(errors: Record<string, string>) {
  return z.object({
    name: localizedNameSchema(errors),
    slug: z
      .string()
      .trim()
      .min(1, errors.hintSlug)
      .min(3, errors.hintSlugMin)
      .regex(/^[a-z0-9-]+$/, errors.hintSlugFormat),
    description: localizedDescriptionSchema(errors),
    image: z.string().nullable().optional(),
    workPrice: z.number().int().min(0, errors.hintWorkPriceNeg),
    workPriceCurrency: z.string().regex(/^[A-Z]{3}$/, errors.hintWorkPriceCurrency),
    baseWorkDays: z.number().int().min(0),
    isActive: z.boolean(),
    hasSlotTemplate: z.boolean(),
    slots: z.array(slotSchema(errors)).default([]),
  });
}

// Статус заявки (PUT /api/admin/orders/[id]).
export const orderStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "done", "cancelled"]),
});

export type ProductInput = z.infer<ReturnType<typeof productSchema>>;
export type ComponentInput = z.infer<ReturnType<typeof componentSchema>>;
export type CategoryInput = z.infer<ReturnType<typeof categorySchema>>;