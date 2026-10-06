/* eslint-disable @next/next/no-img-element */
// Обложка записи — обычный <img>, а не next/image (D-B10): у обложки нет
// заданных размеров, и мы хотим показать её в родном разрешении,
// центрированной, с сохранением пропорций. next/image без width/height
// требует fill-обёртки и ломает центрировку.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdjacentPosts, getPublishedPostBySlug, getTagsForPost, postDateTime } from "@/lib/blog";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { L } from "@/lib/localize";
import { enTranslit } from "@/lib/format";
import { stripMarkdown } from "@/lib/markdown-utils";
import Crumbs from "@/components/ui/Crumbs";
import MarkdownBody from "@/components/blog/MarkdownBody";

// Цвета чипов рубрик — из mockup/blog-post.html (post-tags-line).
const CHIP_CLASSES = ["chip--mustard", "chip--olive", "chip--rust"];

// Автогенерация SEO-полей по образцу товара (product/[slug]/page.tsx):
// ручной ввод хранится как введён (D-B6), без него — из названия/текста,
// EN — транслит названия (D-i18n-2).
function autoTitle(title: string, locale: Locale): string {
  const translated = L(title, locale);
  return locale === "en" ? `${enTranslit(translated)} — JulCraft` : `${translated} — JulCraft`;
}

function autoDescription(content: string, locale: Locale): string {
  return stripMarkdown(L(content, locale)).slice(0, 160);
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const dict = getDictionary(await getLocale());
  // Черновик и несуществующий slug — тот же ответ, что и у страницы: о факте
  // записи не сообщаем (D-B3), метаданные черновика наружу не уходят.
  const post = getPublishedPostBySlug(slug);
  if (!post) return { title: t(dict, "meta.blog.title") };

  const locale = await getLocale();
  const title = L(post.metaTitle, locale) || autoTitle(post.title, locale);
  const description =
    L(post.metaDescription, locale) || autoDescription(post.content, locale);

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  // Единственный путь к записи на витрине: функция сама отсекает черновики
  // и записи с будущей/пустой датой публикации (D-B2).
  const post = getPublishedPostBySlug(slug);
  if (!post) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const blog = dict.blog;

  const title = L(post.title, locale);
  const excerpt = L(post.excerpt, locale);
  const tags = getTagsForPost(post.id);
  // publishedAt у опубликованной записи не null (фильтр blog.ts), но тип
  // допускает null — дата выводится только когда она есть.
  const publishedAt = post.publishedAt;
  const adjacent = publishedAt ? getAdjacentPosts(publishedAt) : { prev: null, next: null };

  return (
    <>
      <Crumbs
        items={[
          { label: blog.crumbsHome, href: "/" },
          { label: blog.title, href: "/blog" },
          { label: title },
        ]}
      />

      <section className="sect">
        <Link className="post-back" href="/blog">
          {blog.backToAll}
        </Link>

        <article>
          <header className="post-head">
            {publishedAt && (
              <time className="post-date" dateTime={publishedAt.toISOString().slice(0, 10)}>
                {postDateTime(publishedAt, locale)}
              </time>
            )}
            <h1>{title}</h1>
            {excerpt !== "" && <p className="post-sub">{excerpt}</p>}
            {tags.length > 0 && (
              <div className="post-tags-line">
                {tags.map((tag, i) => (
                  <a
                    key={tag.id}
                    className={`chip ${CHIP_CLASSES[i % CHIP_CLASSES.length]}`}
                    href={`/blog?tag=${tag.slug}`}
                  >
                    {L(tag.name, locale)}
                  </a>
                ))}
              </div>
            )}
          </header>

          {post.coverImage && (
            <div className="post-cover">
              <img
                src={post.coverImage}
                alt={title}
                loading="lazy"
                decoding="async"
                className="post-cover__img"
              />
            </div>
          )}

          <MarkdownBody source={L(post.content, locale)} />
        </article>

        {(adjacent.prev || adjacent.next) && (
          <div className="post-nav">
            {adjacent.prev && (
              <Link href={`/blog/${adjacent.prev.slug}`}>
                <small>{blog.prevPost}</small>
                <b>{L(adjacent.prev.title, locale)}</b>
              </Link>
            )}
            {adjacent.next && (
              <Link className="pn-next" href={`/blog/${adjacent.next.slug}`}>
                <small>{blog.nextPost}</small>
                <b>{L(adjacent.next.title, locale)}</b>
              </Link>
            )}
          </div>
        )}
      </section>

      <div className="zigzag"></div>
    </>
  );
}
