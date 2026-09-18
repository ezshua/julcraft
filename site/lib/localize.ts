import type { Locale } from "./i18n";

// Порядок перечисления локалей: ru — базовая и фолбэк для всего контента.
const LOCALE_ORDER: readonly Locale[] = ["ru", "en", "uk"];

// localizedString: либо legacy-строка (интерпретируется как RU), либо частичная
// карта locale -> перевод ({ru?, en?, uk?}). Хранится в БД как JSON в текстовом
// поле (см. drizzle/schema.ts); фолбэк на ru.
export type LocalizedString = string | Partial<Record<Locale, string>>;

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

// L(): раскрывает LocalizedString в строку для заданной локали с фолбэком:
// строка -> как есть; объект -> obj[locale] ?? obj.ru ?? первый непустой ?? "".
export function L(
  text: LocalizedString | null | undefined,
  locale: Locale,
): string {
  if (text === null || text === undefined) return "";
  if (typeof text === "string") {
    const parsed = parseLocalized(text);
    return parsed === null ? text : L(parsed, locale);
  }

  const obj = text as Partial<Record<Locale, string>>;
  // Приоритет: запрошенная локаль -> ru -> остальные в порядке LOCALE_ORDER.
  const candidateLocales: Locale[] = [
    locale,
    "ru",
    ...LOCALE_ORDER.filter((l) => l !== locale && l !== "ru"),
  ];
  for (const loc of candidateLocales) {
    const value = obj[loc];
    if (hasValue(value)) return value;
  }
  return "";
}

// firstLocale(): извлекает RU-перевод из LocalizedString (для миграции шага 2).
// legacy-строка -> как есть; объект -> obj.ru ?? первый непустой.
export function firstLocale(
  text: LocalizedString | null | undefined,
): string {
  if (text === null || text === undefined) return "";
  if (typeof text === "string") {
    const parsed = parseLocalized(text);
    return parsed === null ? text : firstLocale(parsed);
  }

  const obj = text as Partial<Record<Locale, string>>;
  if (hasValue(obj.ru)) return obj.ru;
  for (const loc of LOCALE_ORDER) {
    const value = obj[loc];
    if (hasValue(value)) return value;
  }
  return "";
}

// toLS(): legacy-строка/объект -> {ru, en, uk} для формы (EN/UK по умолчанию "").
export function toLS(value: string | Partial<Record<Locale, string>> | null | undefined): { ru: string; en: string; uk: string } {
  if (value === null || value === undefined) return { ru: "", en: "", uk: "" };
  if (typeof value === "string") {
    const parsed = parseLocalized(value);
    if (parsed === null) return { ru: value, en: "", uk: "" };
    return { ru: parsed.ru ?? "", en: parsed.en ?? "", uk: parsed.uk ?? "" };
  }
  return { ru: value.ru ?? "", en: value.en ?? "", uk: value.uk ?? "" };
}

// splitLocalized(): превращает строку из БД в {ru?, en?, uk?}.
// Legacy-строка -> {ru: строка}; JSON-объект -> как есть; пусто/null -> {}.
export function splitLocalized(
  value: string | null | undefined,
): Partial<Record<Locale, string>> {
  if (value === null || value === undefined) return {};
  const parsed = parseLocalized(value);
  if (parsed === null) return { ru: value };
  return parsed;
}

// storeLS(): значение поля формы (объект {ru,en,uk} или legacy-строка) -> строка для БД.
// Пустые ключи пропускаются; пустой результат -> "". Поддерживает оба формата.
export function storeLS(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return joinLocalized(value as Partial<Record<Locale, string>>);
  }
  return "";
}

// joinLocalized(): собирает {ru?, en?, uk?} в строку для БД.
// Пустые/отсутствующие ключи пропускаются; пустой результат -> "".
export function joinLocalized(
  obj: Partial<Record<Locale, string>> | null | undefined,
): string {
  if (!obj) return "";
  const parts: Partial<Record<Locale, string>> = {};
  for (const loc of LOCALE_ORDER) {
    const v = obj[loc];
    if (typeof v === "string" && v.length > 0) parts[loc] = v;
  }
  const keys = Object.keys(parts);
  if (keys.length === 0) return "";
  if (keys.length === 1 && keys[0] === "ru") return parts.ru as string;
  return JSON.stringify(parts);
}

// Текстовые поля БД хранятся как JSON-строки (например, {"ru":"...","en":"..."}),
// поэтому L()/firstLocale() получают на вход строку, а не объект — парсим её.
function parseLocalized(value: string): Partial<Record<Locale, string>> | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") return { ru: parsed };
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      ("ru" in parsed || "en" in parsed || "uk" in parsed)
    ) {
      return parsed as Partial<Record<Locale, string>>;
    }
    return null;
  } catch {
    return null;
  }
}