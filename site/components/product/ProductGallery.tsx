"use client";

import Image from "next/image";
import { useState } from "react";

// Потолок количества фотографий — единый с админкой и zod-схемой (max(6)).
const MAX_IMAGES = 6;

// Галерея товара: главное фото + миниатюры. Количество миниатюр
// равно реальному числу загруженных фото (1..MAX_IMAGES), без
// фейковых плейсхолдеров из макета.
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  // Берём только валидные строки, обрезаем по MAX_IMAGES — на случай,
  // если в БД по какой-то причине оказалось больше (миграция, ручной импорт).
  const realImages = images.filter(Boolean).slice(0, MAX_IMAGES);
  const [active, setActive] = useState(0);

  // Если в активный индекс «приехало» фото, которого больше нет (например,
  // после hot-reload с уменьшенным массивом) — откатываемся на 0.
  const safeActive = active < realImages.length ? active : 0;

  return (
    <div className="gallery">
      <div className="gallery-main">
        {realImages[safeActive] ? (
          <Image
            src={realImages[safeActive]}
            alt={alt}
            width={800}
            height={800}
            sizes="(max-width: 1079px) 100vw, 520px"
            priority
          />
        ) : null}
      </div>
      <div className="gallery-thumbs">
        {realImages.map((src, i) => (
          <div
            className={i === safeActive ? "g-t is-active" : "g-t"}
            key={src + i}
            onClick={() => setActive(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActive(i);
              }
            }}
          >
            <Image
              src={src}
              alt={`Вид ${i + 1}`}
              width={160}
              height={160}
              sizes="160px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
