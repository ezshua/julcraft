import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { storeLS } from "@/lib/localize";
import { productSchema, type ProductInput } from "@/lib/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db.select().from(products).where(eq(products.id, productId)).get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.productNotFound" as DictionaryKey) }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = productSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }

  const data = parsed.data as ProductInput;

  const slugTaken = db
    .select()
    .from(products)
    .where(eq(products.slug, data.slug))
    .get();
  if (slugTaken && slugTaken.id !== productId) {
    return Response.json({ error: t(dict, "admin.errors.slugTaken" as DictionaryKey) }, { status: 400 });
  }

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, data.categoryId))
    .get();
  if (!category) {
    return Response.json({ error: t(dict, "admin.errors.categoryNotFound" as DictionaryKey) }, { status: 400 });
  }

  db.update(products)
    .set({
      name: storeLS(data.name),
      slug: data.slug,
      categoryId: data.categoryId,
      description: storeLS(data.description),
      price: data.price,
      priceCurrency: data.priceCurrency,
      images: data.images,
      isNew: data.isNew,
      isFeatured: data.isFeatured,
      availability: data.availability,
      reserveUntil: data.reserveUntil ? new Date(data.reserveUntil) : null,
      orderDays: data.orderDays,
      metaTitle: storeLS(data.metaTitle) || null,
      metaDescription: storeLS(data.metaDescription) || null,
      ogImage: data.ogImage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))
    .run();

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db.select().from(products).where(eq(products.id, productId)).get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.productNotFound" as DictionaryKey) }, { status: 404 });
  }

  // Заявки с productId остаются — в чеках товар покажется «—»
  db.delete(products).where(eq(products.id, productId)).run();

  return Response.json({ ok: true });
}