import { asc, eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { categories, slotTemplates, products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { isValidComponentTypeCode } from "@/lib/component-types";
import { storeLS } from "@/lib/localize";
import { categorySchema, type CategoryInput } from "@/lib/schemas";

// Категория + слоты (редактор правой панели)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const categoryId = Number.parseInt(id, 10);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();
  if (!category) {
    return Response.json({ error: t(dict, "admin.errors.categoryNotFound" as DictionaryKey) }, { status: 404 });
  }

  const slots = db
    .select()
    .from(slotTemplates)
    .where(eq(slotTemplates.categoryId, categoryId))
    .orderBy(asc(slotTemplates.sortOrder))
    .all();

  return Response.json({ ...category, slots });
}

// Сохранение категории + upsert/удаление слотов
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const categoryId = Number.parseInt(id, 10);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.categoryNotFound" as DictionaryKey) }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = categorySchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }

  const data = parsed.data as CategoryInput;

  for (const s of data.slots) {
    if (s.minQty > s.maxQty) {
      return Response.json({ error: t(dict, "admin.errors.minGreaterThanMax" as DictionaryKey) }, { status: 400 });
    }
    if (!isValidComponentTypeCode(s.componentType)) {
      return Response.json(
        { error: `${t(dict, "admin.errors.unknownSlotType" as DictionaryKey).replace("{code}", s.componentType)}` },
        { status: 400 },
      );
    }
  }

  const slugTaken = db
    .select()
    .from(categories)
    .where(eq(categories.slug, data.slug))
    .get();
  if (slugTaken && slugTaken.id !== categoryId) {
    return Response.json({ error: t(dict, "admin.errors.slugTaken" as DictionaryKey) }, { status: 400 });
  }

  db.update(categories)
    .set({
      name: storeLS(data.name),
      slug: data.slug,
      description: storeLS(data.description),
      image: data.image === undefined ? existing.image : data.image,
      workPrice: data.workPrice,
      workPriceCurrency: data.workPriceCurrency,
      baseWorkDays: data.baseWorkDays,
      isActive: data.isActive,
      hasSlotTemplate: data.hasSlotTemplate,
    })
    .where(eq(categories.id, categoryId))
    .run();

  const existingSlots = db
    .select()
    .from(slotTemplates)
    .where(eq(slotTemplates.categoryId, categoryId))
    .all();
  const submittedIds = new Set(
    data.slots.filter((s) => s.id != null).map((s) => s.id as number),
  );

  let order = 1;
  for (const s of data.slots) {
    const values = {
      name: storeLS(s.name),
      componentType: s.componentType,
      minQty: s.minQty,
      maxQty: s.maxQty,
      sortOrder: order,
    };
    if (s.id != null) {
      db.update(slotTemplates)
        .set(values)
        .where(eq(slotTemplates.id, s.id))
        .run();
    } else {
      db.insert(slotTemplates)
        .values({ categoryId, ...values })
        .run();
    }
    order++;
  }

  for (const s of existingSlots) {
    if (!submittedIds.has(s.id)) {
      db.delete(slotTemplates).where(eq(slotTemplates.id, s.id)).run();
    }
  }

  return Response.json({ ok: true });
}

// Удаление категории (левый список, крестик на карточке).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const categoryId = Number.parseInt(id, 10);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();
  if (!category) {
    return Response.json({ error: t(dict, "admin.errors.categoryNotFound" as DictionaryKey) }, { status: 404 });
  }

  // Категорию с товарами удалять нельзя — сначала перенести/удалить товары.
  const productCount = db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, categoryId))
    .all().length;
  if (productCount > 0) {
    return Response.json(
      {
        error: `${t(dict, "admin.errors.cannotDeleteCategory" as DictionaryKey).replace("{count}", String(productCount)).replace("{unit}", productCount === 1 ? t(dict, "admin.errors.unitItem" as DictionaryKey) : productCount >= 2 && productCount <= 4 ? t(dict, "admin.errors.unitItems" as DictionaryKey) : t(dict, "admin.errors.unitItemsMany" as DictionaryKey))}`,
      },
      { status: 400 },
    );
  }

  db.delete(slotTemplates).where(eq(slotTemplates.categoryId, categoryId)).run();
  db.delete(categories).where(eq(categories.id, categoryId)).run();

  return Response.json({ ok: true });
}