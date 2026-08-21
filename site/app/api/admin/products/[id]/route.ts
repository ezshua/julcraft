import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { productSchema, type ProductInput } from "@/lib/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = db.select().from(products).where(eq(products.id, productId)).get();
  if (!existing) {
    return Response.json({ error: "Товар не найден" }, { status: 404 });
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

  const slugTaken = db
    .select()
    .from(products)
    .where(eq(products.slug, data.slug))
    .get();
  if (slugTaken && slugTaken.id !== productId) {
    return Response.json({ error: "Slug уже занят" }, { status: 400 });
  }

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, data.categoryId))
    .get();
  if (!category) {
    return Response.json({ error: "Категория не найдена" }, { status: 400 });
  }

  db.update(products)
    .set({
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId,
      description: data.description,
      price: data.price,
      priceCurrency: data.priceCurrency,
      images: data.images,
      isNew: data.isNew,
      isFeatured: data.isFeatured,
      availability: data.availability,
      reserveUntil: data.reserveUntil ? new Date(data.reserveUntil) : null,
      orderDays: data.orderDays,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
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
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = db.select().from(products).where(eq(products.id, productId)).get();
  if (!existing) {
    return Response.json({ error: "Товар не найден" }, { status: 404 });
  }

  // Заявки с productId остаются — в чеках товар покажется «—»
  db.delete(products).where(eq(products.id, productId)).run();

  return Response.json({ ok: true });
}