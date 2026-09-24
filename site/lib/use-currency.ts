"use client";

import { type Currency, type FinanceSettings } from "./currency";

/** Валюта для клиентских компонентов; initialCode приходит из SSR-cookie. */
export function useCurrency(finance: FinanceSettings, initialCode: string) {
  const currency: Currency =
    finance.currencies.find((currency) => currency.code === initialCode) ??
    finance.currencies.find((currency) => currency.code === finance.defaultCurrency) ??
    finance.currencies[0];

  return { finance, currency };
}
