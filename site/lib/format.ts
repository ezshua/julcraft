// Утилиты форматирования (этап 3). Форматы — как в макете: "1 950.00 ₴", "3 дня" и т.п.
// Цены (formatPrice) — мультивалютные, см. lib/currency.ts (plan-finances.md).

import type { Locale } from "./i18n";
import type { Dictionary } from "./dictionaries/ru";
import { ru } from "./dictionaries/ru";
import { en } from "./dictionaries/en";
import { uk } from "./dictionaries/uk";

const DICTS_BY_LOCALE: Record<Locale, Dictionary> = { ru, en, uk };

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

/** EN-транслит названия для автогенерации SEO (D-i18n-2): русское имя → латиница,
 * сохраняя пробелы, кавычки и регистр («Broshi»), без slugify-нормализации. */
export function enTranslit(input: string): string {
  return input
    .replace(/[А-ЯЁа-яё]/g, (ch) => {
      const lower = ch.toLowerCase();
      const tr = TRANSLIT[lower];
      if (tr === undefined) return ch;
      return ch === lower ? tr : tr.charAt(0).toUpperCase() + tr.slice(1);
    });
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
export function reserveDayShort(d: Date, locale: Locale): string {
  return DICTS_BY_LOCALE[locale].product.daysShort[d.getDay()];
}

/** Полный день недели из даты: "пятница" (для карточки товара и модалки) */
export function reserveDayFull(d: Date, locale: Locale): string {
  return DICTS_BY_LOCALE[locale].product.daysFull[d.getDay()];
}
