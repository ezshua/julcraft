import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { getPostForAdminById, getTagIdsForPost, getTagsForAdmin } from "@/lib/blog";
import BlogEditor from "@/components/admin/BlogEditor";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: t(dict, "admin.blogEditor.titleEdit" as DictionaryKey) };
}

// Правка записи. Неверный id → 404 (не пустая форма): редактор всегда
// открывается на существующей записи (D-B7 — редактор отдельной страницей).
export default async function EditBlogPostPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  const post = getPostForAdminById(postId);
  if (!post) notFound();

  const tags = getTagsForAdmin()
    .filter((tag) => tag.isActive)
    .map((tag) => ({ id: tag.id, slug: tag.slug, name: tag.name }));

  return (
    <BlogEditor
      tags={tags}
      post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        status: post.status,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        tagIds: getTagIdsForPost(post.id),
      }}
    />
  );
}
