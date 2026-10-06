import { getDictionary, getLocale, t } from "@/lib/i18n";

type Props = {
  /** Активные рубрики витрины: slug и уже локализованное имя. */
  tags: { slug: string; name: string }[];
  activeSlug?: string;
  /** Сколько записей нашлось с текущими фильтрами — подпись «найдено». */
  found: number;
  /** Ссылка фильтра по рубрике (undefined — «все записи»). */
  linkTo: (tagSlug?: string) => string;
};

// Копия блока «Рубрики» из mockup/blog.html: board.board--paper > .filters
export default async function TagFilter({ tags, activeSlug, found, linkTo }: Props) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const blog = dict.blog;

  return (
    <div className="board board--paper mb-30">
      <div className="b-head">
        <h3>{blog.filterTags}</h3>
        <span className="avail" style={{ color: "var(--olive)" }}>
          {t(dict, "blog.found", { n: found })}
        </span>
      </div>
      <div className="b-body">
        <div className="filters">
          <a
            className={activeSlug === undefined ? "filter is-active" : "filter"}
            href={linkTo(undefined)}
          >
            {blog.allTags}
          </a>
          {tags.map((tag) => (
            <a
              key={tag.slug}
              className={tag.slug === activeSlug ? "filter is-active" : "filter"}
              href={linkTo(tag.slug)}
            >
              {tag.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
