import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { productSchema, type ProductInput } from "@/lib/schemas";

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }

  const data = parsed.data as ProductInput;

  const slugTaken = db.select().from(products).where(eq(products.slug, data.slug)).get();
  if (slugTaken) {
    return Response.json({ error: "Slug уже занят" }, { status: 400 });
  }

  const category = db.select().from(categories).where(eq(categories.id, data.categoryId)).get();
  if (!category) {
    return Response.json({ error: "Категория не найдена" }, { status: 400 });
  }

  const now = new Date();
  const res = db
    .insert(products)
    .values({
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId,
      description: data.description,
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
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      ogImage: data.ogImage ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return Response.json({ id: Number(res.lastInsertRowid) });
}