import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { orderStatusSchema } from "@/lib/schemas";

// Смена статуса заявки (PUT) и удаление (DELETE).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = Number.parseInt(id, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!existing) {
    return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Некорректный статус" }, { status: 400 });
  }

  db.update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
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
  const orderId = Number.parseInt(id, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!existing) {
    return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  db.delete(orders).where(eq(orders.id, orderId)).run();

  return Response.json({ ok: true });
}