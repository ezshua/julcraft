"use client";

import { useEffect, useState } from "react";
import {
  CURRENCY_STORAGE_KEY,
  type Currency,
  type FinanceSettings,
} from "./currency";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Выбранная валюта для клиентских компонентов.
 * Первый рендер — серверный код (initialCode из cookie, см. currency-server.ts),
 * чтобы не расходиться с SSR-разметкой; после монтирования сверяемся
 * с cookie/localStorage (D-21) и обновляем состояние.
 */
export function useCurrency(finance: FinanceSettings, initialCode: string) {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    const update = () => {
      let saved: string | null = null;
      try {
        saved = readCookie(CURRENCY_STORAGE_KEY) ?? localStorage.getItem(CURRENCY_STORAGE_KEY);
      } catch {
        saved = null;
      }
      const codes = new Set(finance.currencies.map((c) => c.code));
      if (saved && codes.has(saved) && saved !== initialCode) setCode(saved);
    };
    // Вне синхронного тела эффекта (react-hooks/set-state-in-effect): сначала
    // отрисовка с серверной валютой, затем сверка с локальным выбором.
    const t = window.setTimeout(update, 0);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CURRENCY_STORAGE_KEY) update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("storage", onStorage);
    };
  }, [finance, initialCode]);

  const currency: Currency =
    finance.currencies.find((c) => c.code === code) ??
    finance.currencies.find((c) => c.code === finance.defaultCurrency) ??
    finance.currencies[0];

  return { finance, currency };
}