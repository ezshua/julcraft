import "server-only";
import { cookies } from "next/headers";
import { getSettings } from "./get-settings";
import { type Currency } from "./currency";
import { CURRENCY_COOKIE_KEY, normalizeDefaultCurrency } from "./user-settings";

/**
 * Валюта отображения для серверного рендеринга (D-21, D-i18n-6):
 * cookie → DEFAULT_CURRENCY (.env, если есть в списке валют) → Settings-дефолт → первый.
 * Панель «Вид» (skin-switcher.js) пишет cookie и перезагружает страницу,
 * поэтому SSR всегда рендерит цены в выбранной валюте.
 */
export async function getDisplayCurrency(): Promise<Currency> {
  const finance = getSettings().finance;
  const codes = finance.currencies.map((currency) => currency.code);
  let code = normalizeDefaultCurrency(
    process.env.DEFAULT_CURRENCY,
    codes,
    finance.defaultCurrency,
  );
  try {
    const saved = (await cookies()).get(CURRENCY_COOKIE_KEY)?.value;
    if (saved && codes.includes(saved)) code = saved;
  } catch {
    // вне HTTP-запроса (например, статическая генерация) — дефолт
  }
  return (
    finance.currencies.find((currency) => currency.code === code) ??
    finance.currencies.find((currency) => currency.code === finance.defaultCurrency) ??
    finance.currencies[0]
  );
}