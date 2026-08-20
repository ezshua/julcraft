import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings as settingsTable } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/get-settings";

const KNOWN_KEYS = new Set([
  "contacts.phone",
  "contacts.email",
  "contacts.address",
  "contacts.telegram",
  "contacts.instagram",
  "contacts.hours",
  "about.short",
  "about.history",
  "about.principles",
  "telegram.botToken",
  "telegram.chatId",
]);

// JSON-поля валидируются парсингом при сохранении.
const JSON_KEYS = new Set([
  "contacts.hours",
  "about.short",
  "about.history",
  "about.principles",
]);

const itemSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// Все настройки для формы.
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }
  return Response.json(getSettings());
}

// Сохранение массива {key, value} — только известные ключи; JSON-поля парсятся.
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

  const items = Array.isArray(body) ? body : (body as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Передайте массив {key, value}" }, { status: 400 });
  }

  for (const raw of items) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ error: "Некорректный элемент {key, value}" }, { status: 400 });
    }
    const { key, value } = parsed.data;
    if (!KNOWN_KEYS.has(key)) {
      return Response.json({ error: `Неизвестный ключ: ${key}` }, { status: 400 });
    }
    if (JSON_KEYS.has(key)) {
      try {
        JSON.parse(value);
      } catch {
        return Response.json({ error: `Ключ «${key}» должен быть JSON` }, { status: 400 });
      }
    }
  }

  for (const raw of items) {
    const { key, value } = itemSchema.parse(raw);
    const existing = db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .get();
    if (existing) {
      db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key)).run();
    } else {
      db.insert(settingsTable).values({ key, value }).run();
    }
  }

  return Response.json({ ok: true });
}