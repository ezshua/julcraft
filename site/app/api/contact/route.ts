import { z } from "zod";
import { db } from "@/lib/db";
import { orders } from "@/drizzle/schema";
import { sendTelegram } from "@/lib/telegram";
import { getLocale, getDictionary, t, type DictionaryKey } from "@/lib/i18n";

const contactSchema = z.object({
  name: z.string().trim().min(1, "api.common.name"),
  contact: z.string().trim().min(1, "api.common.contact"),
  message: z.string().trim().min(1, "api.contact.message"),
  channel: z.enum(["phone", "telegram", "email"]).default("phone"),
});

// Форма обратной связи (D-14): сообщение пишется в Order с type=contact
export async function POST(request: Request) {
  const dict = getDictionary(await getLocale());
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: t(dict, "api.common.invalidJson") },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const key =
      (parsed.error.issues[0]?.message ??
        "api.common.invalidData") as DictionaryKey;
    return Response.json({ error: t(dict, key) }, { status: 400 });
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
  const notice = `[записка ${id}] клиент: ${name} (${contact}); сообщение: ${message}`;
  const sent = await sendTelegram(notice);
  if (!sent.ok) console.log(notice);

  return Response.json({ id });
}
