// Мультивалютность v2 (plan-finances2.md): цены хранятся в ИСХОДНОЙ валюте
// как составное (priceMinor, priceCurrency) — целое число копеек исходной валюты
// + код валюты. Отображение: в той же валюте — точно, без пересчёта; в другой —
// конвертируем через USD с максимальной точностью, округляя ТОЛЬКО на выводе.

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  /** Сколько единиц валюты за 1 доллар (USD → display: usd × rate / 100) */
  ratePerUsd: number;
};

export type FinanceSettings = {
  currencies: Currency[];
  defaultCurrency: string;
  /** Границы фильтра цены каталога (как Priced: минора в валюте + код), D-23b */
  filterLow: number;
  filterLowCurrency: string;
  filterHigh: number;
  filterHighCurrency: string;
};

/** Цена в БД: копейки исходной валюты + код этой валюты (D-15) */
export type Priced = { priceMinor: number; priceCurrency: string };

/** Конструктор Priced из минора и кода валюты */
export function asPriced(minor: number, currencyCode: string): Priced {
  return { priceMinor: minor, priceCurrency: currencyCode };
}

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
  // Бывшие границы «до 2 000 ₽ / от 2 500 ₽» (Q-4: правятся в настройках). Храним как
  // Priced в выбранной валюте, по умолчанию — в рублях (rate 85).
  filterLow: amountToMinor(2000),
  filterLowCurrency: "RUB",
  filterHigh: amountToMinor(2500),
  filterHighCurrency: "RUB",
};

const CODE_RE = /^[A-Z]{3}$/;

/** Чтение finance.* из Settings с откатом на дефолты; повреждённые значения игнорируются */
export function parseFinance(
  currenciesRaw: string | undefined,
  defaultRaw: string | undefined,
  filterLowRaw: string | undefined,
  filterHighRaw: string | undefined,
  filterLowCurrencyRaw: string | undefined,
  filterHighCurrencyRaw: string | undefined,
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
  const filterLow = Number.isInteger(low) && low >= 0 ? low : defaultFinance.filterLow;
  const filterHigh =
    Number.isInteger(high) && high >= 0 ? high : defaultFinance.filterHigh;

  const codes = new Set(currencies.map((c) => c.code));
  const lowCur = filterLowCurrencyRaw && codes.has(filterLowCurrencyRaw.toUpperCase())
    ? filterLowCurrencyRaw.toUpperCase()
    : defaultFinance.filterLowCurrency;
  const highCur = filterHighCurrencyRaw && codes.has(filterHighCurrencyRaw.toUpperCase())
    ? filterHighCurrencyRaw.toUpperCase()
    : defaultFinance.filterHighCurrency;

  const def = typeof defaultRaw === "string" ? defaultRaw.toUpperCase() : "";
  const defaultCurrency = currencies.some((c) => c.code === def)
    ? def
    : defaultFinance.defaultCurrency;

  return {
    currencies,
    defaultCurrency,
    filterLow,
    filterLowCurrency: lowCur,
    filterHigh,
    filterHighCurrency: highCur,
  };
}

export function findCurrency(
  finance: FinanceSettings,
  code: string | undefined,
): Currency {
  const found = finance.currencies.find((c) => c.code === (code ?? ""));
  return (
    found ??
    finance.currencies.find((c) => c.code === finance.defaultCurrency) ??
    finance.currencies[0]
  );
}

/** Сумма в валюте → целое число минорных единиц (копеек) этой валюты (D-24) */
export function amountToMinor(amount: number): number {
  return Math.round(amount * 100);
}

/** Минорные единицы (копейки) исходной валюты → сумма для показа/ввода */
export function minorToAmount(minor: number): number {
  return minor / 100;
}

/** USD-центы → сумма в валюте: usdCents × rate / 100 (для границ фильтра, хранимых в USD) */
export function usdCentsToAmount(usdCents: number, ratePerUsd: number): number {
  return (usdCents * ratePerUsd) / 100;
}

/** Сумма в валюте → USD-центы, округление до цента (для границ фильтра) */
export function amountToUsdCents(amount: number, ratePerUsd: number): number {
  return Math.round((amount * 100) / ratePerUsd);
}

/** Перевод Priced в USD-сумму (число, полная точность) для агрегаций/сравнений */
export function toUsdAmount(p: Priced, finance: FinanceSettings): number {
  return p.priceMinor / 100 / findCurrency(finance, p.priceCurrency).ratePerUsd;
}

/** Конвертация Priced в валюту отображения (полная точность, без промежуточных округлений) */
export function convertPriced(
  p: Priced,
  display: Currency,
  finance: FinanceSettings,
): Priced {
  if (p.priceCurrency === display.code) return p;
  const usd = toUsdAmount(p, finance);
  return {
    priceMinor: Math.round(usd * display.ratePerUsd * 100),
    priceCurrency: display.code,
  };
}

/** D-19: всегда 2 знака, символ после числа: "1 950.00 ₴" */
export function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

/** Цена из БД (Priced) → строка в валюте отображения (D-18/D-19) */
export function formatPrice(
  p: Priced,
  display: Currency,
  finance: FinanceSettings,
): string {
  const target = convertPriced(p, display, finance);
  return formatMoney(target.priceMinor / 100, display.symbol);
}

/** Исторические суммы (snapshot configJson старых заявок) — как сохранены, с пометкой ₽ (Q-6) */
export function formatSnapshot(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

/**
 * Агрегация списка цен (конфигуратор, чек, дашборд) — D-26.
 * База = валюта отображения `display`. Если все слагаемые в одной валюте —
 * считаем напрямую, без хода через USD; совпадение с отображаемой → точно.
 * Иначе конвертируем только несовпадающие с display в неё и суммируем в ней.
 * Промежуточных округлений НЕТ — только финальное (возвращаем Priced в display).
 */
export function sumPriced(
  items: Priced[],
  display: Currency,
  finance: FinanceSettings,
): Priced {
  const currencies = new Set(items.map((i) => i.priceCurrency));
  if (currencies.size === 1) {
    const base = [...currencies][0];
    const sumMinor = items.reduce((s, i) => s + i.priceMinor, 0);
    if (base === display.code) return { priceMinor: sumMinor, priceCurrency: base };
    const usd = sumMinor / 100 / findCurrency(finance, base).ratePerUsd;
    return {
      priceMinor: Math.round(usd * display.ratePerUsd * 100),
      priceCurrency: display.code,
    };
  }
  let acc = 0; // в единицах валюты отображения (float, полная точность)
  for (const i of items) {
    if (i.priceCurrency === display.code) acc += i.priceMinor / 100;
    else acc += toUsdAmount(i, finance) * display.ratePerUsd;
  }
  return { priceMinor: Math.round(acc * 100), priceCurrency: display.code };
}

/** Валидация finance.* для сохранения в Settings (route api/admin/settings) */
export function validateFinanceSettings(
  currencies: unknown,
  defaultCurrency: unknown,
  filterLow?: Priced,
  filterHigh?: Priced,
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

  const asCurrencies = currencies as Currency[];
  const checkBound = (b: Priced | undefined, name: string): string | null => {
    if (!b) return null;
    if (!Number.isInteger(b.priceMinor) || b.priceMinor < 0) {
      return `${name}: целое число (копейки) >= 0`;
    }
    if (!codes.has(b.priceCurrency)) {
      return `${name}: неизвестная валюта «${b.priceCurrency}»`;
    }
    return null;
  };
  const lowErr = checkBound(filterLow, "finance.filterLow");
  if (lowErr) return lowErr;
  const highErr = checkBound(filterHigh, "finance.filterHigh");
  if (highErr) return highErr;

  if (filterLow && filterHigh) {
    const f: FinanceSettings = {
      currencies: asCurrencies,
      defaultCurrency: defaultCurrency as string,
      filterLow: 0,
      filterLowCurrency: "USD",
      filterHigh: 0,
      filterHighCurrency: "USD",
    };
    if (toUsdAmount(filterLow, f) >= toUsdAmount(filterHigh, f)) {
      return "finance: нижняя граница фильтра должна быть меньше верхней";
    }
  }
  return null;
}
