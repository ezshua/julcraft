import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JulCraft — витрина · эст. 1976",
};

export default function HomePage() {
  return (
    <>
      <div className="signboard">
        <p className="est">✹ эст. 1976 · открыто снова ✹</p>
        <h1>JulCraft</h1>
        <p className="tag">украшения · винтажная бижутерия · ремонт бабушкиных бус</p>
        <div className="cta-row">
          <a className="btn btn--primary" href="/catalog">
            Смотреть каталог
          </a>
          <a className="btn btn--secondary" href="/configurator">
            Собрать своё
          </a>
        </div>
      </div>
      <div className="zigzag"></div>
    </>
  );
}
