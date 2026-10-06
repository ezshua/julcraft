import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { blogPosts } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { getAllPostsForAdmin, getTagsForPost, isValidTagIds, setPostTags } from "@/lib/blog";
import { storeLS } from "@/lib/localize";
import { blogPostSchema, type BlogPostInput } from "@/lib/schemas";

// Список записей панели со всеми статусами и рубриками каждой записи.
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const posts = getAllPostsForAdmin();
  return Response.json({
    posts: posts.map((post) => ({
      ...post,
      tags: getTagsForPost(post.id).map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
      })),
    })),
  });
}

// Новая запись: всегда черновик, даты публикации нет (D-B8/D-B14).
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

  const parsed = blogPostSchema(dict.admin.errors).safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }
  const data = parsed.data as BlogPostInput;

  const slugTaken = db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, data.slug))
    .get();
  if (slugTaken) {
    return Response.json({ error: t(dict, "admin.errors.slugTaken" as DictionaryKey) }, { status: 400 });
  }

  if (!isValidTagIds(data.tagIds)) {
    return Response.json(
      { error: t(dict, "admin.errors.hintTagName" as DictionaryKey) },
      { status: 400 },
    );
  }

  const res = db
    .insert(blogPosts)
    .values({
      slug: data.slug,
      title: storeLS(data.title),
      excerpt: storeLS(data.excerpt),
      content: storeLS(data.content),
      coverImage: data.coverImage ?? null,
      metaTitle: storeLS(data.metaTitle) || null,
      metaDescription: storeLS(data.metaDescription) || null,
      status: "draft",
      publishedAt: null,
    })
    .run();

  const id = Number(res.lastInsertRowid);
  setPostTags(id, data.tagIds);
  return Response.json({ id });
}
