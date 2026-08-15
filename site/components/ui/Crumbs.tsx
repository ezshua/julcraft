import Link from "next/link";

type CrumbsItem = {
  label: string;
  href?: string;
};

// Копия nav.crumbs из mockup/category.html: ссылки + span.sep + span.cur
export default function Crumbs({ items }: { items: CrumbsItem[] }) {
  return (
    <nav className="crumbs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {i > 0 && <span className="sep">›</span>}
            {isLast || !item.href ? (
              <span className="cur">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
