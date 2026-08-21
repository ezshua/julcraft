import "server-only";
import { cookies } from "next/headers";
import { getSettings } from "./get-settings";
import { CURRENCY_STORAGE_KEY, type Currency } from "./currency";

/**
 * Валюта отображения для серверного рендеринга (D-21):
 * cookie julcraft-currency → дефолт из Settings.
 * Панель «Вид» (skin-switcher.js) пишет cookie и перезагружает страницу,
 * поэтому SSR всегда рендерит цены в выбранной валюте.
 */
export async function getDisplayCurrency(): Promise<Currency> {
  const finance = getSettings().finance;
  let code = finance.defaultCurrency;
  try {
    const store = await cookies();
    const saved = store.get(CURRENCY_STORAGE_KEY)?.value;
    if (saved && finance.currencies.some((c) => c.code === saved)) code = saved;
  } catch {
    // вне HTTP-запроса (например, статическая генерация) — дефолт
  }
  return (
    finance.currencies.find((c) => c.code === code) ??
    finance.currencies.find((c) => c.code === finance.defaultCurrency) ??
    finance.currencies[0]
  );
}