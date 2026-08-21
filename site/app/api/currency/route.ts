import { getSettings } from "@/lib/get-settings";

// Публичный список валют + дефолт (D-25): для панели «Вид» (skin-switcher.js)
// и клиентских компонентов (конфигуратор — Этап 5).
export async function GET() {
  const { finance } = getSettings();
  return Response.json({
    currencies: finance.currencies,
    default: finance.defaultCurrency,
  });
}