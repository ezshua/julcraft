import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { storeLS } from "@/lib/localize";
import { productSchema, type ProductInput } from "@/lib/schemas";

export async function POST(request: Request) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
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

  const slugTaken = db.select().from(products).where(eq(products.slug, data.slug)).get();
  if (slugTaken) {
    return Response.json({ error: t(dict, "admin.errors.slugTaken" as DictionaryKey) }, { status: 400 });
  }

  const category = db.select().from(categories).where(eq(categories.id, data.categoryId)).get();
  if (!category) {
    return Response.json({ error: t(dict, "admin.errors.categoryNotFound" as DictionaryKey) }, { status: 400 });
  }

  const now = new Date();
  const res = db
    .insert(products)
    .values({
      name: storeLS(data.name),
      slug: data.slug,
      categoryId: data.categoryId,
      description: storeLS(data.description),
      price: data.price,
      priceCurrency: data.priceCurrency,
      images: data.images,
      materials: [],
      specs: [],
      isNew: data.isNew,
      isFeatured: data.isFeatured,
      availability: data.availability,
      reserveUntil: data.reserveUntil ? new Date(data.reserveUntil) : null,
      orderDays: data.orderDays,
      metaTitle: storeLS(data.metaTitle) || null,
      metaDescription: storeLS(data.metaDescription) || null,
      ogImage: data.ogImage ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return Response.json({ id: Number(res.lastInsertRowid) });
}