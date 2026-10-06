import { eq } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { blogPosts } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { L } from "@/lib/localize";
import { blogPublishSchema } from "@/lib/schemas";

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Публикация и снятие с публикации (D-B14):
//   publish   → status = published, publishedAt = publishedAt ?? now;
//   unpublish → status = draft, publishedAt сохраняется.
// Повторное нажатие «Опубликовать» дату не перетирает (D-B8).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseId(id);
  if (!postId) {
    return Response.json({ error: t(dict, "admin.errors.badId" as DictionaryKey) }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t(dict, "admin.errors.badJson" as DictionaryKey) }, { status: 400 });
  }

  const parsed = blogPublishSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? t(dict, "admin.errors.badData" as DictionaryKey);
    return Response.json({ error: message }, { status: 400 });
  }

  const post = db.select().from(blogPosts).where(eq(blogPosts.id, postId)).get();
  if (!post) {
    return Response.json({ error: t(dict, "admin.errors.postNotFound" as DictionaryKey) }, { status: 404 });
  }

  if (parsed.data.action === "unpublish") {
    db.update(blogPosts)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(blogPosts.id, postId))
      .run();
    return Response.json({ ok: true, status: "draft" });
  }

  // Публиковать можно только запись с заголовком и текстом.
  if (L(post.title, locale).trim() === "" || L(post.content, locale).trim() === "") {
    return Response.json(
      { error: t(dict, "admin.errors.postNotPublishable" as DictionaryKey) },
      { status: 400 },
    );
  }

  db.update(blogPosts)
    .set({
      status: "published",
      publishedAt: post.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, postId))
    .run();
  return Response.json({ ok: true, status: "published" });
}
