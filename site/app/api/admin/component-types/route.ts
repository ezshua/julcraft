import { asc } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { componentTypes } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { storeLS } from "@/lib/localize";
import {
  componentTypeCreateSchema,
  type ComponentTypeCreateInput,
} from "@/lib/schemas";

// Список типов (для админки; публично не используется).
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const rows = db
    .select()
    .from(componentTypes)
    .orderBy(asc(componentTypes.sortOrder), asc(componentTypes.id))
    .all();
  return Response.json({ types: rows });
}

// Создание типа.
export async function POST(request: Request) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = componentTypeCreateSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }
  const data = parsed.data as ComponentTypeCreateInput;

  // Уникальность кода обеспечивает unique-индекс; конфликт отдаём как 409.
  try {
    const res = db
      .insert(componentTypes)
      .values({
        code: data.code,
        name: storeLS(data.name),
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      })
      .run();
    return Response.json({ id: Number(res.lastInsertRowid) });
  } catch {
    return Response.json(
      { error: t(dict, "admin.errors.typeCodeExists" as DictionaryKey) },
      { status: 409 },
    );
  }
}
