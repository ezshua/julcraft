import { and, eq, ne } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { blogPosts } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import {
  deletePostTags,
  getTagIdsForPost,
  isValidTagIds,
  setPostTags,
} from "@/lib/blog";
import { storeLS } from "@/lib/localize";
import { blogPostSchema, type BlogPostInput } from "@/lib/schemas";

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Запись + её рубрики — форма редактора загружает их отсюда.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseId(id);
  if (!postId) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const post = db.select().from(blogPosts).where(eq(blogPosts.id, postId)).get();
  if (!post) {
    return Response.json({ error: t(dict, "admin.errors.postNotFound" as DictionaryKey) }, { status: 404 });
  }

  return Response.json({ ...post, tagIds: getTagIdsForPost(postId) });
}

// Сохранение полей и рубрик. Статус и дату публикации здесь не трогаем —
// их меняет только /publish (D-B14), поэтому обычное сохранение не может
// случайно опубликовать черновик или подменить дату.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseId(id);
  if (!postId) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db.select().from(blogPosts).where(eq(blogPosts.id, postId)).get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.postNotFound" as DictionaryKey) }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = blogPostSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }
  const data = parsed.data as BlogPostInput;

  // Тот же slug у другой записи — конфект (уникальный индекс как подстраховка).
  const slugConflict = db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, data.slug), ne(blogPosts.id, postId)))
    .get();
  if (slugConflict) {
    return Response.json({ error: t(dict, "admin.errors.slugTaken" as DictionaryKey) }, { status: 400 });
  }

  if (!isValidTagIds(data.tagIds)) {
    return Response.json(
      { error: t(dict, "admin.errors.hintTagName" as DictionaryKey) },
      { status: 400 },
    );
  }

  db.update(blogPosts)
    .set({
      slug: data.slug,
      title: storeLS(data.title),
      excerpt: storeLS(data.excerpt),
      content: storeLS(data.content),
      coverImage: data.coverImage ?? null,
      metaTitle: storeLS(data.metaTitle) || null,
      metaDescription: storeLS(data.metaDescription) || null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, postId))
    .run();

  setPostTags(postId, data.tagIds);
  return Response.json({ ok: true });
}

// Удаление записи и её связей с рубриками (связи чистим в коде — D-B1).
// Файлы загруженных картинок остаются на месте, как у товаров.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseId(id);
  if (!postId) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  const existing = db.select().from(blogPosts).where(eq(blogPosts.id, postId)).get();
  if (!existing) {
    return Response.json({ error: t(dict, "admin.errors.postNotFound" as DictionaryKey) }, { status: 404 });
  }

  deletePostTags(postId);
  db.delete(blogPosts).where(eq(blogPosts.id, postId)).run();
  return Response.json({ ok: true });
}
