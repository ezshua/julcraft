import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { components } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { isValidComponentTypeCode } from "@/lib/component-types";
import { componentSchema, type ComponentInput } from "@/lib/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const componentId = Number.parseInt(id, 10);
  if (!Number.isInteger(componentId) || componentId <= 0) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(components)
    .where(eq(components.id, componentId))
    .get();
  if (!existing) {
    return Response.json({ error: "Комплектующее не найдено" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = componentSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }

  const data = parsed.data as ComponentInput;
  if (!isValidComponentTypeCode(data.componentType)) {
    return Response.json(
      { error: "Неизвестный тип комплектующего" },
      { status: 400 },
    );
  }

  db.update(components)
    .set({
      name: data.name,
      componentType: data.componentType,
      price: data.price,
      priceCurrency: data.priceCurrency,
      processingPrice: data.processingPrice,
      processingPriceCurrency: data.processingPriceCurrency,
      processingDays: data.processingDays,
      stockQty: data.stockQty,
      isOrderable: data.isOrderable,
      deliveryDays: data.deliveryDays,
      photo: data.photo,
      isActive: data.isActive,
    })
    .where(eq(components.id, componentId))
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
  const componentId = Number.parseInt(id, 10);
  if (!Number.isInteger(componentId) || componentId <= 0) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(components)
    .where(eq(components.id, componentId))
    .get();
  if (!existing) {
    return Response.json({ error: "Комплектующее не найдено" }, { status: 404 });
  }

  db.delete(components).where(eq(components.id, componentId)).run();

  return Response.json({ ok: true });
}