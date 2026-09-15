import { cookies } from "next/headers";
import { ru, type Dictionary } from "./dictionaries/ru";
import { en } from "./dictionaries/en";
import { uk } from "./dictionaries/uk";

export type Locale = "ru" | "en" | "uk";

export const LOCALES: readonly Locale[] = ["ru", "en", "uk"];

export const LOCALE_STORAGE_KEY = "julcraft-locale";

export type DictionaryKey = {
  [K in keyof Dictionary & string]: Dictionary[K] extends string
    ? K
    : Dictionary[K] extends object
      ? Dictionary[K] extends readonly unknown[]
        ? never
        : `${K}.${KeyPaths<Dictionary[K]> & string}`
      : never;
}[keyof Dictionary & string];

type KeyPaths<T> = T extends string
  ? never
  : T extends readonly unknown[]
    ? never
    : {
        [K in keyof T & string]: T[K] extends string
          ? K
          : T[K] extends object
            ? T[K] extends readonly unknown[]
              ? never
              : `${K}.${KeyPaths<T[K]> & string}`
            : never;
      }[keyof T & string];

export type PluralForms =
  | readonly [string, string]
  | readonly [string, string, string];

export type TranslationParams = Record<string, string | number>;

const dictionaries: Record<Locale, Dictionary> = { ru, en, uk };

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export async function getLocale(): Promise<Locale> {
  try {
    const saved = (await cookies()).get(LOCALE_STORAGE_KEY)?.value;
    if (isLocale(saved)) return saved;
  } catch {
    return "ru";
  }
  // i18n-3: здесь появится слой .env DEFAULT_LOCALE (cookie → .env → ru)
  return "ru";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function t(
  dict: Dictionary,
  key: DictionaryKey,
  params?: TranslationParams,
): string {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return key;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") return key;
  if (params === undefined) return node;
  return node.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function plural(n: number, forms: PluralForms, locale: Locale): string {
  const [one, few, many] = forms;
  if (locale === "en") {
    return n === 1 ? one : (few ?? many);
  }
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few ?? one;
  return many ?? few ?? one;
}
