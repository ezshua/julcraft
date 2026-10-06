import { getDictionary, getLocale, plural } from "@/lib/i18n";
import type { BlogGroup } from "@/lib/blog";
import PostCard from "./PostCard";

// Копия группы дат из mockup/blog.html: div.blog-group
export default async function PostGroup({ group }: { group: BlogGroup }) {
  const locale = await getLocale();
  const blog = getDictionary(locale).blog;
  const count = group.posts.length;
  const months = blog.months;

  return (
    <div className="blog-group">
      <div className="blog-group-h">
        <h2 className="sec-h2" style={{ marginBottom: "0" }}>
          {`${months[group.month - 1]} ${group.year}`}
        </h2>
        <span className="bg-count">
          {count} {plural(count, blog.groupCount, locale)}
        </span>
      </div>
      <div className="shelf">
        {group.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
