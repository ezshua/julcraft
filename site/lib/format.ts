// Утилиты форматирования (этап 3). Форматы — как в макете: "1 950 ₽", "3 дня" и т.п.

const SHORT_DAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const FULL_DAYS = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

/** 1950 → "1 950 ₽" (разделитель тысяч — неразрывный пробел, ru-RU) */
export function formatPrice(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

/** Склонение: plural(3, ["день","дня","дней"]) → "дня" */
export function plural(
  n: number,
  [one, few, many]: [string, string, string],
): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Короткий день недели из даты: "пт" (для полки) */
export function reserveDayShort(d: Date): string {
  return SHORT_DAYS[d.getDay()];
}

/** Полный день недели из даты: "пятница" (для карточки товара и модалки) */
export function reserveDayFull(d: Date): string {
  return FULL_DAYS[d.getDay()];
}

/**
 * Подмена query изображения.
 * В БД URL хранится с `w=800&q=80`; галерея использует w=900 / w=300.
 */
export function imgWith(url: string, w: number, q = 80): string {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("w", String(w));
  params.set("q", String(q));
  return `${base}?${params.toString()}`;
}
