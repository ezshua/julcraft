import Link from "next/link";
import CategoryIcon from "./CategoryIcon";

type CategoryCardProps = {
  slug: string;
  name: string;
  desc: string;
  count: string;
  href: string;
  disabled?: boolean;
};

// Копия карточки категории из mockup/home.html: a.item.item--cat
export default function CategoryCard({
  slug,
  name,
  desc,
  count,
  href,
  disabled,
}: CategoryCardProps) {
  if (disabled) {
    return (
      <div className="item item--cat is-disabled" title="Нет шаблона слотов">
        <CategoryIcon slug={slug} />
        <div className="info">
          <h3>{name}</h3>
          <p className="desc">{desc}</p>
          <span className="count">{count}</span>
        </div>
      </div>
    );
  }
  return (
    <Link className="item item--cat" href={href}>
      <CategoryIcon slug={slug} />
      <div className="info">
        <h3>{name}</h3>
        <p className="desc">{desc}</p>
        <span className="count">{count}</span>
      </div>
    </Link>
  );
}
