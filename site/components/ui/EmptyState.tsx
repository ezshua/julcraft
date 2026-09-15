import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n";

// Копия div.empty-state из mockup/catalog.html (демо «Если полка опустеет»)
export default async function EmptyState() {
  const catalog = getDictionary(await getLocale()).catalog;
  return (
    <div className="empty-state">
      <div className="receipt" style={{ padding: "40px 30px" }}>
        <div className="es-big">☙</div>
        <b>{catalog.emptyTitle}</b>
        <p>{catalog.emptyText}</p>
        <Link className="btn btn--primary btn--small" href="/configurator">
          {catalog.emptyButton}
        </Link>
      </div>
    </div>
  );
}
