import type { Metadata } from "next";
import {
  buildPostGroups,
  getActiveTagsWithCounts,
  getPublishedPosts,
  type BlogGroup,
} from "@/lib/blog";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import { L } from "@/lib/localize";
import Crumbs from "@/components/ui/Crumbs";
import BlogEmpty from "@/components/blog/BlogEmpty";
import DateNav from "@/components/blog/DateNav";
import PostGroup from "@/components/blog/PostGroup";
import TagFilter from "@/components/blog/TagFilter";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    title: t(dict, "meta.blog.title"),
    description: t(dict, "meta.blog.description"),
    alternates: { canonical: "/blog" },
    openGraph: {
      title: t(dict, "meta.blog.title"),
      description: t(dict, "meta.blog.descriptionOg"),
      type: "website",
    },
  };
}

// Сколько записей забираем за один проход к blog.ts.
const NAV_BATCH = 500;

// Все опубликованные записи — только через публичный blog.ts (D-B2).
// Функция отдаёт их постранично, поэтому обходим страницы до конца:
// список нужен для навигации по датам (какие годы и месяцы вообще есть).
function allPublishedGroups(): BlogGroup[] {
  const first = getPublishedPosts({ perPage: NAV_BATCH });
  const posts = [...first.posts];
  for (let page = 2; page <= first.pages; page += 1) {
    posts.push(...getPublishedPosts({ perPage: NAV_BATCH, page }).posts);
  }
  return buildPostGroups(posts);
}

// Некорректные значения фильтра игнорируем, а не показываем ошибку.
function parseYear(value: string | undefined): number | undefined {
  const year = Number.parseInt(value ?? "", 10);
  return Number.isInteger(year) && year >= 1970 && year <= 9999 ? year : undefined;
}

function parseMonth(value: string | undefined): number | undefined {
  const month = Number.parseInt(value ?? "", 10);
  return month >= 1 && month <= 12 ? month : undefined;
}

function parseTag(value: string | undefined): string | undefined {
  return value && /^[a-z0-9-]+$/.test(value) ? value : undefined;
}

function buildUrl(params: Record<string, string | undefined>): string {
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.set(key, value);
  }
  const query = url.toString();
  return query ? `/blog?${query}` : "/blog";
}

export default async function BlogPage(props: {
  searchParams: Promise<{ y?: string; m?: string; tag?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const blog = dict.blog;

  const year = parseYear(sp.y);
  // Месяц без года не имеет смысла (?m=9 без ?y=) — показываем весь год.
  const month = year === undefined ? undefined : parseMonth(sp.m);
  const tagSlug = parseTag(sp.tag);
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const list = getPublishedPosts({ year, month, tagSlug, page: requestedPage });
  const tags = getActiveTagsWithCounts();

  // Навигация по датам строится по всем опубликованным записям: фильтр
  // рубрики не должен прятать пункты меню дат.
  const dateGroups = allPublishedGroups();
  const years = [...new Set(dateGroups.map((g) => g.year))].sort((a, b) => b - a);
  const months = year === undefined ? [] : dateGroups.filter((g) => g.year === year).map((g) => g.month);

  const baseParams = {
    y: year === undefined ? undefined : String(year),
    m: month === undefined ? undefined : String(month),
    tag: tagSlug,
  };
  const pageUrl = (page: number) =>
    buildUrl({ ...baseParams, page: page > 1 ? String(page) : undefined });
  const tagUrl = (slug?: string) => buildUrl({ ...baseParams, tag: slug });
  const dateUrl = (y?: number, m?: number) =>
    buildUrl({
      y: y === undefined ? undefined : String(y),
      m: m === undefined ? undefined : String(m),
      tag: tagSlug,
    });

  const filtered = tagSlug !== undefined || year !== undefined;

  return (
    <>
      <Crumbs
        items={[
          { label: blog.crumbsHome, href: "/" },
          { label: blog.title },
        ]}
      />

      <div className="signboard signboard--small">
        <p className="est">{blog.est}</p>
        <h1>{blog.title}</h1>
        <p className="tagline">{blog.tagline}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <p className="sec-sub">{blog.secSub}</p>

        <TagFilter
          tags={tags.map((tag) => ({ slug: tag.slug, name: L(tag.name, locale) }))}
          activeSlug={tagSlug}
          found={list.total}
          linkTo={tagUrl}
        />

        <DateNav
          years={years}
          months={months.sort((a, b) => b - a)}
          selectedYear={year}
          selectedMonth={month}
          linkTo={dateUrl}
        />

        {list.posts.length === 0 ? (
          <BlogEmpty filtered={filtered} />
        ) : (
          <>
            {list.groups.map((group) => (
              <PostGroup key={`${group.year}-${group.month}`} group={group} />
            ))}

            {list.pages > 1 && (
              <div className="pagination">
                {list.page === 1 ? (
                  <span className="page-btn is-disabled">←</span>
                ) : (
                  <a className="page-btn" href={pageUrl(list.page - 1)}>
                    ←
                  </a>
                )}
                {Array.from({ length: list.pages }, (_, i) => i + 1).map((page) =>
                  page === list.page ? (
                    <span className="page-btn is-active" key={page}>
                      {page}
                    </span>
                  ) : (
                    <a className="page-btn" key={page} href={pageUrl(page)}>
                      {page}
                    </a>
                  ),
                )}
                {list.page === list.pages ? (
                  <span className="page-btn is-disabled">→</span>
                ) : (
                  <a className="page-btn" href={pageUrl(list.page + 1)}>
                    →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <div className="zigzag"></div>
    </>
  );
}
