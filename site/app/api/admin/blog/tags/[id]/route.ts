import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { blogTags } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { deleteTagLinks } from "@/lib/blog";
import { storeLS } from "@/lib/localize";
import { blogTagUpdateSchema, type BlogTagUpdateInput } from "@/lib/schemas";

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Точечные правки рубрики: название, порядок, активность. slug не меняется —
// он идентификатор для ссылок фильтра витрины.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseId(id);
  if (!tagId) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db.select().from(blogTags).where(eq(blogTags.id, tagId)).get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.tagNotFound" as DictionaryKey) }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = blogTagUpdateSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }
  const data = parsed.data as BlogTagUpdateInput;

  if (data.name === undefined && data.sortOrder === undefined && data.isActive === undefined) {
    return Response.json(
      { error: t(dict, "admin.errors.noFieldsToUpdate" as DictionaryKey) },
      { status: 400 },
    );
  }

  db.update(blogTags)
    .set({
      name: data.name === undefined ? undefined : storeLS(data.name),
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    })
    .where(eq(blogTags.id, tagId))
    .run();

  return Response.json({ ok: true });
}

// Удаление рубрики снимает её связи, записи остаются (plan-5-blog.md §9).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseId(id);
  if (!tagId) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db.select().from(blogTags).where(eq(blogTags.id, tagId)).get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.tagNotFound" as DictionaryKey) }, { status: 404 });
  }

  deleteTagLinks(tagId);
  db.delete(blogTags).where(eq(blogTags.id, tagId)).run();
  return Response.json({ ok: true });
}
