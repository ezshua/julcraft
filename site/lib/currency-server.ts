import "server-only";
import { cookies } from "next/headers";
import { getSettings } from "./get-settings";
import { CURRENCY_STORAGE_KEY, type Currency } from "./currency";

/**
 * Валюта отображения для серверного рендеринга (D-21, D-i18n-6):
 * cookie → DEFAULT_CURRENCY (.env, если есть в списке валют) → Settings-дефолт → первый.
 * Панель «Вид» (skin-switcher.js) пишет cookie и перезагружает страницу,
 * поэтому SSR всегда рендерит цены в выбранной валюте.
 */
export async function getDisplayCurrency(): Promise<Currency> {
  const finance = getSettings().finance;
  const codes = new Set(finance.currencies.map((c) => c.code));
  let code = finance.defaultCurrency;
  try {
    const store = await cookies();
    const saved = store.get(CURRENCY_STORAGE_KEY)?.value;
    if (saved && codes.has(saved)) {
      code = saved;
    } else {
      const env = process.env.DEFAULT_CURRENCY;
      if (env !== undefined && env !== "") {
        if (codes.has(env)) {
          code = env;
        } else {
          // env задан, но отсутствует в Settings-списке валют — игнорируем env
          console.warn(
            `[currency] DEFAULT_CURRENCY=${env} отсутствует в списке валют Settings; используется дефолт Settings`,
          );
        }
      }
    }
  } catch {
    // вне HTTP-запроса (например, статическая генерация) — дефолт
  }
  return (
    finance.currencies.find((c) => c.code === code) ??
    finance.currencies.find((c) => c.code === finance.defaultCurrency) ??
    finance.currencies[0]
  );
}