import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, getLocale, plural, t, type DictionaryKey } from "@/lib/i18n";
import { L } from "@/lib/localize";
import {
  getAllPostsForAdmin,
  getTagsForAdmin,
  getTagsForPost,
} from "@/lib/blog";
import AdminTabs from "@/components/admin/AdminTabs";
import BlogPublishButton from "@/components/admin/BlogPublishButton";
import BlogTagsManager from "@/components/admin/BlogTagsManager";
import DeleteButton from "@/components/admin/DeleteButton";
import { AdminDictProvider } from "@/components/admin/admin-dict-context";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return { title: t(dict, "admin.blog.title" as DictionaryKey) };
}

// Плейсхолдер обложки из mockup/admin/blog.html.
const COVER_PLACEHOLDER = (
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

// Цвета чипов рубрик по кругу — из блока blog-tags-cell макета.
const CHIP_CYCLE = ["chip--mustard", "chip--rust", "chip--olive"];

function buildUrl(params: Record<string, string | undefined>): string {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.set(k, v);
  }
  const qs = url.toString();
  return qs ? `/admin/blog?${qs}` : "/admin/blog";
}

// Дата в формате колонки макета: 18.09.2026
function fmtDate(date: Date | null): string {
  if (!date) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export default async function AdminBlogPage(props: {
  searchParams: Promise<{ status?: string; tag?: string; q?: string }>;
}) {
  const sp = await props.searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.admin.blog;

  const status = ["draft", "published"].includes(sp.status ?? "") ? (sp.status as "draft" | "published") : "all";
  const tagSlug = sp.tag && /^[a-z0-9-]+$/.test(sp.tag) ? sp.tag : undefined;
  const q = sp.q?.trim() ?? "";

  const allPosts = getAllPostsForAdmin();
  const tags = getTagsForAdmin();
  const posts = getAllPostsForAdmin({ status, tagSlug, q: q || undefined });

  const draftCount = allPosts.filter((p) => p.status === "draft").length;
  const statusFilters = [
    { value: "all", label: d.filterAll, count: allPosts.length },
    { value: "draft", label: d.filterDrafts, count: draftCount },
    { value: "published", label: d.filterPublished, count: allPosts.length - draftCount },
  ];

  const baseParams = {
    status: status !== "all" ? status : undefined,
    tag: tagSlug,
  };

  const postsTab = (
    <div>
      <div className="board board--paper mb-20" style={{ padding: "16px 20px" }}>
        <div
          className="blog-toolbar"
          style={{ display: "flex", gap: "14px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <div className="filters">
            {statusFilters.map((f) => (
              <a
                key={f.value}
                className={status === f.value ? "filter is-active" : "filter"}
                href={buildUrl({ ...baseParams, status: f.value === "all" ? undefined : f.value })}
              >
                {`${f.label} (${f.count})`}
              </a>
            ))}
          </div>
          <div className="filters">
            <a
              className={tagSlug === undefined ? "filter is-active" : "filter"}
              href={buildUrl({ status: baseParams.status })}
            >
              {d.filterTagsAll}
            </a>
            {tags.map((tag) => (
              <a
                key={tag.id}
                className={tagSlug === tag.slug ? "filter is-active" : "filter"}
                href={buildUrl({ ...baseParams, tag: tag.slug })}
              >
                {L(tag.name, locale)}
              </a>
            ))}
          </div>
          <form className="field blog-search" method="get" action="/admin/blog">
            {baseParams.status && <input type="hidden" name="status" value={baseParams.status} />}
            {baseParams.tag && <input type="hidden" name="tag" value={baseParams.tag} />}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={d.searchPlaceholder}
              aria-label={d.searchAria}
            />
          </form>
        </div>
      </div>

      {allPosts.length === 0 ? (
        <div className="empty-state mt-40">
          <div className="receipt" style={{ padding: "40px 30px" }}>
            <div className="es-big">☙</div>
            <b>{d.emptyTitle}</b>
            <p>{d.emptyText}</p>
            <Link className="btn btn--primary btn--small" href="/admin/blog/new">
              {d.emptyButton}
            </Link>
          </div>
        </div>
      ) : (
        <div className="board">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{d.colCover}</th>
                  <th>{d.colPost}</th>
                  <th>{d.colTags}</th>
                  <th>{d.colDate}</th>
                  <th>{d.colStatus}</th>
                  <th>{d.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const title = L(post.title, locale);
                  const postTags = getTagsForPost(post.id);
                  const published = post.status === "published";
                  return (
                    <tr key={post.id}>
                      <td>
                        <div className="thumb thumb--cover">
                          {post.coverImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={post.coverImage} alt="" />
                          ) : (
                            COVER_PLACEHOLDER
                          )}
                        </div>
                      </td>
                      <td className="cell-name">
                        <b>{title}</b>
                        <small>{post.slug}</small>
                      </td>
                      <td>
                        <div className="blog-tags-cell" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {postTags.length === 0 ? (
                            <span className="none">{d.noTags}</span>
                          ) : (
                            postTags.map((tag, i) => (
                              <span
                                key={tag.id}
                                className={`chip ${CHIP_CYCLE[i % CHIP_CYCLE.length]}`}
                              >
                                {L(tag.name, locale)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="num">{fmtDate(post.publishedAt)}</td>
                      <td>
                        <span className={published ? "tag tag--done" : "tag tag--none"}>
                          {published ? d.statusPublished : d.statusDraft}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          {published && (
                            <a
                              className="icon-btn"
                              style={{ width: 32, height: 32 }}
                              title={d.viewTitle}
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              👁
                            </a>
                          )}
                          <Link
                            className="icon-btn"
                            style={{ width: 32, height: 32 }}
                            title={d.editTitle}
                            href={`/admin/blog/${post.id}`}
                          >
                            ✎
                          </Link>
                          <BlogPublishButton
                            postId={post.id}
                            status={post.status}
                            dict={{
                              publish: d.publish,
                              unpublish: d.unpublish,
                              publishTitle: d.publishTitle,
                              unpublishTitle: d.unpublishTitle,
                              error: d.errorPublish,
                            }}
                          />
                          <DeleteButton
                            url={`/api/admin/blog/${post.id}`}
                            confirmText={d.confirmDelete.replace("{name}", title)}
                            dict={{ deleteTitle: d.deleteTitle, deleteFailed: d.deleteFailed }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>
                      {d.nothingFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const tagsTab = (
    <BlogTagsManager
      tags={tags.map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        sortOrder: tag.sortOrder,
        isActive: tag.isActive,
        postCount: tag.postCount,
      }))}
    />
  );

  return (
    <AdminDictProvider dict={dict.admin} locale={locale}>
      <div className="page-title">
        <h1>{d.heading}</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">
            {`${draftCount} ${plural(draftCount, d.doodle, locale)}`}
          </span>
          <Link className="btn btn--primary" href="/admin/blog/new">
            {d.newButton}
          </Link>
        </div>
      </div>

      <AdminTabs
        firstLabel={d.tabPosts}
        secondLabel={d.tabTags}
        first={postsTab}
        second={tagsTab}
      />
    </AdminDictProvider>
  );
}
