import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, products, slotTemplates } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";

// Список категорий со счётчиками (подписи левой панели)
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const allCategories = db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder))
    .all();
  const allProducts = db.select().from(products).all();
  const allSlots = db.select().from(slotTemplates).all();

  return Response.json(
    allCategories.map((c) => ({
      ...c,
      productCount: allProducts.filter((p) => p.categoryId === c.id).length,
      slotCount: allSlots.filter((s) => s.categoryId === c.id).length,
    })),
  );
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  slug: z
    .string()
    .trim()
    .min(1, "Укажите slug")
    .regex(/^[a-z0-9-]+$/, "Slug: только латиница, цифры и дефис"),
  workPrice: z.number().int().min(0, "Работа не может быть отрицательной"),
  workPriceCurrency: z.string().regex(/^[A-Z]{3}$/, "Некорректный код валюты работы"),
  baseWorkDays: z.number().int().min(0),
});

// Новая категория (модалка modal-cat из макета)
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;

  const slugTaken = db.select().from(categories).where(eq(categories.slug, data.slug)).get();
  if (slugTaken) {
    return Response.json({ error: "Slug уже занят" }, { status: 400 });
  }

  const maxOrder =
    db.select({ m: categories.sortOrder }).from(categories).all().reduce(
      (m, r) => Math.max(m, r.m),
      0,
    ) + 1;

  const res = db
    .insert(categories)
    .values({
      name: data.name,
      slug: data.slug,
      description: "",
      workPrice: data.workPrice,
      workPriceCurrency: data.workPriceCurrency,
      baseWorkDays: data.baseWorkDays,
      hasSlotTemplate: true,
      isActive: true,
      sortOrder: maxOrder,
    })
    .run();

  return Response.json({ id: Number(res.lastInsertRowid) });
}

const bulkOrderSchema = z.object({
  items: z.array(z.object({ id: z.number().int().positive(), sortOrder: z.number().int() })).min(1),
});

// Порядок категорий (drag&drop, Решение 5б)
export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = bulkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Некорректные данные" }, { status: 400 });
  }

  for (const item of parsed.data.items) {
    db.update(categories)
      .set({ sortOrder: item.sortOrder })
      .where(eq(categories.id, item.id))
      .run();
  }

  return Response.json({ ok: true });
}