import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { components } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { isValidComponentTypeCode } from "@/lib/component-types";
import { storeLS } from "@/lib/localize";
import { componentSchema, type ComponentInput } from "@/lib/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const componentId = Number.parseInt(id, 10);
  if (!Number.isInteger(componentId) || componentId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db
    .select()
    .from(components)
    .where(eq(components.id, componentId))
    .get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.componentNotFound" as DictionaryKey) }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = componentSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }

  const data = parsed.data as ComponentInput;
  if (!isValidComponentTypeCode(data.componentType)) {
    return Response.json(
      { error: t(dict, "admin.errors.unknownComponentType" as DictionaryKey) },
      { status: 400 },
    );
  }

  db.update(components)
    .set({
      name: storeLS(data.name),
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
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const componentId = Number.parseInt(id, 10);
  if (!Number.isInteger(componentId) || componentId <= 0) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db
    .select()
    .from(components)
    .where(eq(components.id, componentId))
    .get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.componentNotFound" as DictionaryKey) }, { status: 404 });
  }

  db.delete(components).where(eq(components.id, componentId)).run();

  return Response.json({ ok: true });
}