import { z } from "zod";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "@/lib/db";
import { orders } from "@/drizzle/schema";
import { sendTelegram, sendTelegramPhoto } from "@/lib/telegram";
import { getLocale, getDictionary, t, type DictionaryKey } from "@/lib/i18n";

const contactSchema = z.object({
  name: z.string().trim().min(1, "api.common.name"),
  contact: z.string().trim().min(1, "api.common.contact"),
  message: z.string().trim().min(1, "api.contact.message"),
  channel: z.enum(["phone", "telegram", "email"]).default("phone"),
  // Иллюстрация к сообщению: путь, полученный с публичного /api/upload?kind=contacts.
  photoPath: z.string().trim().optional().default(""),
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

  const { name, contact, message, photoPath } = parsed.data;

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
      photoPath: photoPath || null,
      calcPrice: 0,
      calcDays: 0,
      status: "new",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const id = Number(res.lastInsertRowid);

  // Уведомление мастеру в Telegram; без токенов — лог (поведение не меняется).
  // Текст шаблонизируется через t() под локаль клиента (п. 6c).
  const notice = t(dict, "api.orders.orderContact", {
    id: String(id),
    client: name,
    contact,
    message,
  });
  // Иллюстрацию шлём отдельным фото, если она есть (Telegram не может
  // Download картинку по локальному URL, как с collagePath).
  let sent = { ok: false as boolean };
  if (photoPath && photoPath.startsWith("/")) {
    try {
      const buf = await readFile(resolve(process.cwd(), "public", photoPath.replace(/^\//, "")));
      sent = await sendTelegramPhoto(
        notice,
        buf,
        photoPath.split("/").pop() ?? "photo.jpg",
        photoPath.endsWith(".png") ? "image/png" : photoPath.endsWith(".webp") ? "image/webp" : "image/jpeg",
      );
    } catch {
      sent = { ok: false };
    }
  }
  if (!sent.ok) {
    const t2 = await sendTelegram(notice);
    if (!t2.ok) console.log(notice);
  }

  return Response.json({ id });
}
