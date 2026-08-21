// Мультивалютность (plan-finances.md): все цены в БД — USD-центы (целое число, ×100),
// отображение — в валюте из Settings (finance.*), выбранной через панель «Вид».

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  /** Сколько единиц валюты за 1 доллар (USD → display: usdCents × rate / 100) */
  ratePerUsd: number;
};

export type FinanceSettings = {
  currencies: Currency[];
  defaultCurrency: string;
  /** Границы фильтра цены каталога, USD-центы (finance.filterLow / finance.filterHigh) */
  filterLow: number;
  filterHigh: number;
};

/** Ключ cookie и localStorage выбранной валюты (D-21) */
export const CURRENCY_STORAGE_KEY = "julcraft-currency";

// Стартовые курсы 44 / 85 / 0.92 (D-22) — правятся в настройках (вкладка «Финансы»)
export const defaultFinance: FinanceSettings = {
  currencies: [
    { code: "USD", name: "Доллар", symbol: "$", ratePerUsd: 1 },
    { code: "UAH", name: "Гривна", symbol: "₴", ratePerUsd: 44 },
    { code: "RUB", name: "Рубль", symbol: "₽", ratePerUsd: 85 },
    { code: "EUR", name: "Евро", symbol: "€", ratePerUsd: 0.92 },
  ],
  defaultCurrency: "UAH",
  // Бывшие границы «до 2 000 ₽ / от 2 500 ₽» по курсу рубля 85 (Q-4: правятся в настройках)
  filterLow: 2353,
  filterHigh: 2941,
};

const CODE_RE = /^[A-Z]{3}$/;

/** Чтение finance.* из Settings с откатом на дефолты; повреждённые значения игнорируются */
export function parseFinance(
  currenciesRaw: string | undefined,
  defaultRaw: string | undefined,
  filterLowRaw: string | undefined,
  filterHighRaw: string | undefined,
): FinanceSettings {
  let currencies = defaultFinance.currencies;
  try {
    const parsed = JSON.parse(currenciesRaw ?? "") as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed
        .filter(
          (c): c is Record<string, unknown> =>
            !!c &&
            typeof c === "object" &&
            typeof (c as Record<string, unknown>).code === "string" &&
            typeof (c as Record<string, unknown>).symbol === "string" &&
            typeof (c as Record<string, unknown>).ratePerUsd === "number",
        )
        .map((c) => ({
          code: String(c.code).toUpperCase(),
          name:
            typeof c.name === "string" && c.name.trim() !== ""
              ? c.name
              : String(c.code),
          symbol: c.symbol as string,
          ratePerUsd: c.ratePerUsd as number,
        }))
        .filter((c) => CODE_RE.test(c.code) && Number.isFinite(c.ratePerUsd) && c.ratePerUsd > 0);
      const codes = new Set(cleaned.map((c) => c.code));
      const unique = cleaned.filter((c) => {
        if (codes.has(c.code)) {
          codes.delete(c.code);
          return true;
        }
        return false;
      });
      if (unique.length > 0) {
        // USD обязателен всегда (D-17); если его нет в списке — возвращаем к дефолтам
        if (unique.some((c) => c.code === "USD")) currencies = unique;
      }
    }
  } catch {
    // повреждённый JSON — дефолты
  }

  const low = Number(filterLowRaw);
  const high = Number(filterHighRaw);
  const filterLow = Number.isInteger(low) && low > 0 ? low : defaultFinance.filterLow;
  const filterHigh =
    Number.isInteger(high) && high > 0 ? high : defaultFinance.filterHigh;

  const def = typeof defaultRaw === "string" ? defaultRaw.toUpperCase() : "";
  const defaultCurrency = currencies.some((c) => c.code === def)
    ? def
    : defaultFinance.defaultCurrency;

  return { currencies, defaultCurrency, filterLow, filterHigh };
}

export function findCurrency(
  finance: FinanceSettings,
  code: string | undefined,
): Currency {
  const found = finance.currencies.find((c) => c.code === (code ?? ""));
  return found ?? finance.currencies.find((c) => c.code === finance.defaultCurrency) ?? finance.currencies[0];
}

/** USD-центы → сумма в валюте: usdCents × rate / 100 (D-18) */
export function usdCentsToAmount(usdCents: number, ratePerUsd: number): number {
  return (usdCents * ratePerUsd) / 100;
}

/** Сумма в валюте → USD-центы, округление до цента (D-18) */
export function amountToUsdCents(amount: number, ratePerUsd: number): number {
  return Math.round((amount * 100) / ratePerUsd);
}

/** D-19: всегда 2 знака, символ после числа: "1 950.00 ₴" */
export function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

/** Цена из БД (USD-центы) → строка в валюте отображения */
export function formatPrice(usdCents: number, currency: Currency): string {
  return formatMoney(usdCentsToAmount(usdCents, currency.ratePerUsd), currency.symbol);
}

/** Исторические суммы (snapshot configJson старых заявок) — как сохранены, с пометкой ₽ (Q-6) */
export function formatSnapshot(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

/** Валидация finance.* для сохранения в Settings (route api/admin/settings) */
export function validateFinanceSettings(
  currencies: unknown,
  defaultCurrency: unknown,
  filterLow: unknown,
  filterHigh: unknown,
): string | null {
  if (!Array.isArray(currencies) || currencies.length === 0) {
    return "finance.currencies: нужен непустой список валют";
  }
  const codes = new Set<string>();
  for (const raw of currencies) {
    if (!raw || typeof raw !== "object") {
      return "finance.currencies: элемент должен быть объектом";
    }
    const c = raw as Record<string, unknown>;
    if (typeof c.code !== "string" || !CODE_RE.test(c.code)) {
      return "finance.currencies: code — 3 латинские буквы в верхнем регистре";
    }
    if (codes.has(c.code)) {
      return `finance.currencies: код ${c.code} повторяется`;
    }
    codes.add(c.code);
    if (typeof c.name !== "string" || c.name.trim() === "") {
      return `finance.currencies: у ${c.code} пустое название`;
    }
    if (typeof c.symbol !== "string" || c.symbol.trim() === "") {
      return `finance.currencies: у ${c.code} пустой символ`;
    }
    if (
      typeof c.ratePerUsd !== "number" ||
      !Number.isFinite(c.ratePerUsd) ||
      c.ratePerUsd <= 0
    ) {
      return `finance.currencies: у ${c.code} курс должен быть числом > 0`;
    }
  }
  const usd = currencies.find(
    (c) => (c as Record<string, unknown>).code === "USD",
  ) as Record<string, unknown> | undefined;
  if (!usd) {
    return "finance.currencies: USD обязателен — его нельзя удалить";
  }
  if (usd.ratePerUsd !== 1) {
    return "finance.currencies: курс USD всегда равен 1";
  }
  if (typeof defaultCurrency !== "string" || !codes.has(defaultCurrency)) {
    return "finance.defaultCurrency: валюта должна быть в списке валют";
  }
  if (
    typeof filterLow !== "number" ||
    !Number.isInteger(filterLow) ||
    filterLow <= 0
  ) {
    return "finance.filterLow: целое число больше нуля (USD-центы)";
  }
  if (
    typeof filterHigh !== "number" ||
    !Number.isInteger(filterHigh) ||
    filterHigh <= 0
  ) {
    return "finance.filterHigh: целое число больше нуля (USD-центы)";
  }
  if (filterLow >= filterHigh) {
    return "finance: нижняя граница фильтра должна быть меньше верхней";
  }
  return null;
}