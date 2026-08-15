import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products } from "@/drizzle/schema";

const orderSchema = z.object({
  type: z.literal("product"),
  productId: z.number().int().positive(),
  customerName: z.string().trim().min(1, "Укажите имя"),
  contact: z.string().trim().min(1, "Укажите контакт"),
  message: z.string().trim().default(""),
});

// Заявка на готовое изделие: серверный расчёт цены/срока, запись Order.
// (custom-заявки — Этап 5.) Уведомление мастеру — заглушка console.log.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }

  const { productId, customerName, contact, message } = parsed.data;

  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return Response.json({ error: "Товар не найден" }, { status: 400 });
  }

  const now = new Date();
  const res = db
    .insert(orders)
    .values({
      type: "product",
      customerName,
      contact,
      message,
      productId: product.id,
      configJson: JSON.stringify({ productId: product.id }),
      collagePath: null,
      calcPrice: product.price,
      calcDays: 0,
      status: "new",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const id = Number(res.lastInsertRowid);

  // Уведомление мастеру (заглушка; реальная отправка — Этапы 4.6/5.4)
  console.log(
    `[заявка ${id}] товар: ${product.name}; клиент: ${customerName} (${contact}); ` +
      `цена: ${product.price} ₽; сообщение: ${message || "—"}`,
  );

  return Response.json({ id });
}
