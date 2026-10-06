import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { blogTags } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { getTagsForAdmin } from "@/lib/blog";
import { storeLS } from "@/lib/localize";
import { slugify } from "@/lib/format";
import { blogTagCreateSchema, type BlogTagCreateInput } from "@/lib/schemas";

// Все рубрики панели со счётчиком записей (включая неактивные).
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }
  return Response.json({ tags: getTagsForAdmin() });
}

// Новая рубрика. slug нормализуется через slugify(название) и проверяется
// на уникальность; дальше он не меняется (как code у типов комплектующих).
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

  const parsed = blogTagCreateSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }
  const data = parsed.data as BlogTagCreateInput;

  const slug = slugify(data.slug) || slugify(data.name.ru ?? "");
  if (!slug) {
    return Response.json(
      { error: t(dict, "admin.errors.hintTagSlugFormat" as DictionaryKey) },
      { status: 400 },
    );
  }

  const slugTaken = db.select().from(blogTags).where(eq(blogTags.slug, slug)).get();
  if (slugTaken) {
    return Response.json({ error: t(dict, "admin.errors.slugTaken" as DictionaryKey) }, { status: 400 });
  }

  const res = db
    .insert(blogTags)
    .values({
      slug,
      name: storeLS(data.name),
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    })
    .run();
  return Response.json({ id: Number(res.lastInsertRowid) });
}
