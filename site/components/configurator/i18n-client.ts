// Клиентская часть i18n для зоны конфигуратора: lib/i18n.ts тянет next/headers
// (server-only), поэтому клиентские компоненты зоны получают словарь пропсами,
// а интерполяцию и plural делают эти локальные копии чистых функций ядра.
import type { PluralForms } from "@/lib/i18n";

export function t(template: string, params?: Record<string, string | number>): string {
  if (params === undefined) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function plural(n: number, forms: PluralForms, locale: string): string {
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
