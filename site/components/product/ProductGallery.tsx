"use client";

import { useState } from "react";
import { imgWith } from "@/lib/format";

const THUMB_SVGS = [
  <svg key="ell" viewBox="0 0 24 24" width="56" height="56">
    <ellipse cx="12" cy="12" rx="8" ry="10" fill="#e8b64c" stroke="#22242a" strokeWidth="2" />
  </svg>,
  <svg key="diam" viewBox="0 0 24 24" width="56" height="56">
    <path d="M12 2l7 7-7 13L5 9z" fill="#d0785a" stroke="#22242a" strokeWidth="2" />
  </svg>,
];

// Галерея товара из product.html: главное фото + миниатюры (до 4, слоты добиваются SVG-эскизами макета)
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  const realCount = images.slice(0, 4).length;
  const thumbs: React.ReactNode[] = images.slice(0, 4).map((src, i) => (
    <div
      className={i === active ? "g-t is-active" : "g-t"}
      key={i}
      onClick={() => setActive(i)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgWith(src, 300)} alt={`Вид ${i + 1}`} loading="lazy" decoding="async" />
    </div>
  ));
  for (let i = realCount; i < 4; i++) {
    thumbs.push(
      <div className="g-t" key={`svg-${i}`}>
        {THUMB_SVGS[(i - realCount) % 2]}
      </div>,
    );
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgWith(images[0], 900)} alt={alt} loading="lazy" decoding="async" />
      </div>
      <div className="gallery-thumbs">{thumbs}</div>
    </div>
  );
}
