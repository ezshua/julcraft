import type { Metadata } from "next";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { getTagsForAdmin } from "@/lib/blog";
import BlogEditor from "@/components/admin/BlogEditor";

// Новая запись: форма пустая, запись создаётся первым сохранением (POST).
// Защита панели — в app/admin/(panel)/layout.tsx.
export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: t(dict, "admin.blogEditor.titleNew" as DictionaryKey) };
}

export default async function NewBlogPostPage() {
  const tags = getTagsForAdmin()
    .filter((tag) => tag.isActive)
    .map((tag) => ({ id: tag.id, slug: tag.slug, name: tag.name }));

  return <BlogEditor tags={tags} />;
}
