import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n";

type Props = {
  /** true — пусто из-за фильтра (рубрика/дата), false — записей нет вовсе. */
  filtered?: boolean;
};

// Копия блока «Пока здесь пусто» из mockup/blog.html: h2.sec-h2 + sec-sub
// + div.empty-state с чеком. Ссылка «все записи» появляется только при
// активном фильтре — в макете этот сценарий не показан.
export default async function BlogEmpty({ filtered }: Props) {
  const locale = await getLocale();
  const blog = getDictionary(locale).blog;

  return (
    <>
      <h2 className="sec-h2">{blog.emptyTitle}</h2>
      <p className="sec-sub">{blog.emptySub}</p>
      <div className="empty-state">
        <div className="receipt" style={{ padding: "40px 30px" }}>
          <div className="es-big">☙</div>
          <b>{blog.emptyReceiptTitle}</b>
          <p>{blog.emptyText}</p>
          <Link className="btn btn--primary btn--small" href="/catalog">
            {blog.emptyButton}
          </Link>
          {filtered && (
            <p className="muted" style={{ marginTop: "14px", marginBottom: 0 }}>
              <Link href="/blog">{blog.backToAll}</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
