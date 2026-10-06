import Link from "next/link";
import Image from "next/image";
import { getTagsForPost, postDate } from "@/lib/blog";
import { getLocale, type Locale } from "@/lib/i18n";
import { L } from "@/lib/localize";
import type { BlogPost } from "@/drizzle/schema";

// Цвета чипов рубрик — из mockup/blog.html (chip--mustard / chip--rust /
// chip--olive); по кругу, чтобы карточки не выглядели одинаково.
const CHIP_CLASSES = ["chip--mustard", "chip--rust", "chip--olive"];

// Плейсхолдер обложки — svg из блока «Запись без обложки» макета.
const PLACEHOLDER_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22242a"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="1.6" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

// Копия карточки записи из mockup/blog.html: a.item.post-card
export default async function PostCard({ post }: { post: BlogPost }) {
  const locale = await getLocale();
  const title = L(post.title, locale);
  const excerpt = L(post.excerpt, locale);
  const tags = getTagsForPost(post.id);

  return (
    <Link className="item post-card" href={`/blog/${post.slug}`}>
      {post.coverImage ? (
        <div className="photo" style={{ position: "relative" }}>
          <Image
            src={post.coverImage}
            alt={title}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1079px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="photo photo--none">{PLACEHOLDER_ICON}</div>
      )}
      <div className="info">
        <h3>{title}</h3>
        {excerpt !== "" && <p className="desc">{excerpt}</p>}
        <div className="post-meta">
          {post.publishedAt && (
            <span className="post-date">{postDate(post.publishedAt, locale)}   </span>
          )}
          {tags.length > 0 && (
            <span className="post-tags">
              {tags.map((tag, i) => (
                <span key={tag.id} className={`chip ${CHIP_CLASSES[i % CHIP_CLASSES.length]}`}>
                  {L(tag.name, locale)}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
