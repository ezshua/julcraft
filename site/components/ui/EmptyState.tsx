import Link from "next/link";

// Копия div.empty-state из mockup/catalog.html (демо «Если полка опустеет»)
export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="receipt" style={{ padding: "40px 30px" }}>
        <div className="es-big">☙</div>
        <b>Здесь пока пусто</b>
        <p>
          В этом отделе пока ничего нет — но Юля уже греет бакелит на верстаке.
          Загляните позже или соберите своё украшение в конфигураторе.
        </p>
        <Link className="btn btn--primary btn--small" href="/configurator">
          Собрать своё
        </Link>
      </div>
    </div>
  );
}
