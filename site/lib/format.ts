// Утилиты форматирования (этап 3). Форматы — как в макете: "1 950.00 ₴", "3 дня" и т.п.
// Цены (formatPrice) — мультивалютные, см. lib/currency.ts (plan-finances.md).

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

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e",
  ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Транслитерация русского названия в slug (в стиле seed-данных: й→j, ы→y, ц→c) */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => TRANSLIT[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export {
  formatPrice,
  formatMoney,
  formatSnapshot,
  asPriced,
  toUsdAmount,
  sumPriced,
  convertPriced,
} from "./currency";
export type { Priced, Currency, FinanceSettings } from "./currency";

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
