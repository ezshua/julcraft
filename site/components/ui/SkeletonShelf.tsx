// Копия демо-скелетона из mockup/category.html (3 карточки)
export default function SkeletonShelf() {
  return (
    <div className="shelf">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="skeleton skeleton--img"></div>
          <div className="skeleton skeleton--line w60" style={{ marginTop: "12px" }}></div>
          <div className="skeleton skeleton--line"></div>
          <div className="skeleton skeleton--line w40"></div>
        </div>
      ))}
    </div>
  );
}
