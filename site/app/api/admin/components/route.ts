import { db } from "@/lib/db";
import { components } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { isValidComponentTypeCode } from "@/lib/component-types";
import { componentSchema, type ComponentInput } from "@/lib/schemas";

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

  const res = db
    .insert(components)
    .values({
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
    .run();

  return Response.json({ id: Number(res.lastInsertRowid) });
}