import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products, type BlogPost } from "@/drizzle/schema";
import { getPublishedPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site-url";

// Сколько записей забираем за один проход к blog.ts.
const BLOG_BATCH = 500;

// Все опубликованные записи: blog.ts отдаёт их постранично и только
// опубликованные (D-B2), поэтому черновик в карту не попадает по построению.
function allPublishedPosts(): BlogPost[] {
  const first = getPublishedPosts({ perPage: BLOG_BATCH });
  const posts = [...first.posts];
  for (let page = 2; page <= first.pages; page += 1) {
    posts.push(...getPublishedPosts({ perPage: BLOG_BATCH, page }).posts);
  }
  return posts;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/configurator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/contacts`, changeFrequency: "yearly", priority: 0.6 },
  ];

  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)
    .all();

  const categoryEntries: MetadataRoute.Sitemap = cats
    .filter((c) => c.slug !== "vintazhnyj-remont")
    .flatMap((c) => [
      { url: `${base}/catalog/${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 },
      ...(c.hasSlotTemplate
        ? [{ url: `${base}/configurator/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.5 }]
        : []),
    ]);

  const productEntries: MetadataRoute.Sitemap = db
    .select()
    .from(products)
    .all()
    .map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const blogEntries: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.7 },
    ...allPublishedPosts().map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticPages, ...categoryEntries, ...productEntries, ...blogEntries];
}
