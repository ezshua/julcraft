import Link from "next/link";

type CategoryCardProps = {
  slug: string;
  name: string;
  desc: string;
  count: string;
  href: string;
  image?: string | null;
  disabled?: boolean;
};

// Копия карточки категории из mockup/home.html: a.item.item--cat
export default function CategoryCard({
  slug,
  name,
  desc,
  count,
  href,
  image,
  disabled,
}: CategoryCardProps) {
  const icon = image ? (
    <div className="cat-icon">
      <img src={image} alt="" />
    </div>
  ) : (
    <div className="cat-icon cat-icon--empty" />
  );

  if (disabled) {
    return (
      <div className="item item--cat is-disabled" title="Нет шаблона слотов">
        {icon}
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
      {icon}
      <div className="info">
        <h3>{name}</h3>
        <p className="desc">{desc}</p>
        <span className="count">{count}</span>
      </div>
    </Link>
  );
}
