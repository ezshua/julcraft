import { z } from "zod";
import { db } from "@/lib/db";
import { orders } from "@/drizzle/schema";
import { sendTelegram } from "@/lib/telegram";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя"),
  contact: z.string().trim().min(1, "Укажите контакт"),
  message: z.string().trim().min(1, "Напишите сообщение"),
  channel: z.enum(["phone", "telegram", "email"]).default("phone"),
});

// Форма обратной связи (D-14): сообщение пишется в Order с type=contact
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }

  const { name, contact, message } = parsed.data;

  const now = new Date();
  const res = db
    .insert(orders)
    .values({
      type: "contact",
      customerName: name,
      contact,
      message,
      productId: null,
      configJson: "{}",
      collagePath: null,
      calcPrice: 0,
      calcDays: 0,
      status: "new",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const id = Number(res.lastInsertRowid);

  // Уведомление мастеру в Telegram; без токенов — лог (поведение не меняется).
  const notice = `[контакт ${id}] клиент: ${name} (${contact}); сообщение: ${message}`;
  const sent = await sendTelegram(notice);
  if (!sent.ok) console.log(notice);

  return Response.json({ id });
}
