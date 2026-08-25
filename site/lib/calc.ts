// Единый источник формул конфигуратора (Этап 5, D-4/D-5): импортируется и
// клиентом (живой калькулятор), и сервером (пересчёт заявки — клиенту не доверяем).
// Без server-only: файл должен быть клиентобезопасным.

import {
  asPriced,
  sumPriced,
  type Currency,
  type FinanceSettings,
  type Priced,
} from "./currency";

export const MAX_COLLAGE_BYTES = 2 * 1024 * 1024;

/** Выбор клиента: id + количество (клиент передаёт серверу только это) */
export type Selection = { componentId: number; qty: number };

/** Компонент, обогащённый данными БД (то, что нужно формулам) */
export type CalcComponent = {
  id: number;
  name: string;
  componentType: string;
  priceMinor: number;
  priceCurrency: string;
  processingPriceMinor: number;
  processingPriceCurrency: string;
  processingDays: number;
  stockQty: number;
  isOrderable: boolean;
  deliveryDays: number | null;
};

export type CalcCategory = {
  name: string;
  workPriceMinor: number;
  workPriceCurrency: string;
  baseWorkDays: number;
};

/** Категория требует заказ компонента? (D-5: stockQty=0 && isOrderable) */
function needsOrder(c: CalcComponent): boolean {
  return c.stockQty === 0 && c.isOrderable && (c.deliveryDays ?? 0) > 0;
}

/**
 * D-4 — цена конфигурации в валюте отображения:
 * работа категории + Σ(price + processingPrice) выбранных компонентов.
 */
export function calcConfigPrice(
  category: CalcCategory,
  selections: Selection[],
  componentsById: Map<number, CalcComponent>,
  display: Currency,
  finance: FinanceSettings,
): { total: Priced; work: Priced; componentsSum: Priced } {
  const work = asPriced(category.workPriceMinor, category.workPriceCurrency);
  const parts: Priced[] = [];
  for (const sel of selections) {
    if (sel.qty <= 0) continue;
    const c = componentsById.get(sel.componentId);
    if (!c) continue;
    for (let i = 0; i < sel.qty; i++) {
      parts.push(asPriced(c.priceMinor, c.priceCurrency));
      parts.push(asPriced(c.processingPriceMinor, c.processingPriceCurrency));
    }
  }
  return {
    work,
    componentsSum: sumPriced(parts, display, finance),
    total: sumPriced([work, ...parts], display, finance),
  };
}

/**
 * D-5 — срок изготовления:
 * база категории + Σ(processingDays × qty) + max(deliveryDays компонентов «под заказ»).
 */
export function calcConfigDays(
  category: CalcCategory,
  selections: Selection[],
  componentsById: Map<number, CalcComponent>,
): { days: number; processingDays: number; deliveryDays: number } {
  let processingDays = 0;
  let deliveryDays = 0;
  for (const sel of selections) {
    if (sel.qty <= 0) continue;
    const c = componentsById.get(sel.componentId);
    if (!c) continue;
    processingDays += c.processingDays * sel.qty;
    if (needsOrder(c)) {
      deliveryDays = Math.max(deliveryDays, c.deliveryDays ?? 0);
    }
  }
  return { days: category.baseWorkDays + processingDays + deliveryDays, processingDays, deliveryDays };
}

/** Canonical snapshot custom-заявки (configJson) — валюто-осознанный */
export type ConfigSnapshot = {
  categoryId: number;
  categoryName: string;
  categoryWorkPrice: Priced;
  items: Array<{
    componentId: number;
    name: string;
    componentType: string;
    qty: number;
    price: Priced;
    processingPrice: Priced;
    isOrderable: boolean;
    deliveryDays: number | null;
  }>;
  total: Priced;
  days: number;
};

/** Сборка снимка из обогащённых данных. selections с qty<=0 не попадают. */
export function buildSnapshot(
  categoryId: number,
  category: CalcCategory,
  selections: Selection[],
  componentsById: Map<number, CalcComponent>,
  display: Currency,
  finance: FinanceSettings,
): ConfigSnapshot {
  const items = selections
    .filter((s) => s.qty > 0)
    .map((s) => {
      const c = componentsById.get(s.componentId)!;
      return {
        componentId: c.id,
        name: c.name,
        componentType: c.componentType,
        qty: s.qty,
        price: asPriced(c.priceMinor, c.priceCurrency),
        processingPrice: asPriced(c.processingPriceMinor, c.processingPriceCurrency),
        isOrderable: c.isOrderable,
        deliveryDays: c.deliveryDays,
      };
    });
  const { total, days } = calcTotals(category, selections, componentsById, display, finance);
  return {
    categoryId,
    categoryName: category.name,
    categoryWorkPrice: asPriced(category.workPriceMinor, category.workPriceCurrency),
    items,
    total,
    days,
  };
}

/** Цена + срок одной парой вызовов (удобство для API-роута и модалки) */
export function calcTotals(
  category: CalcCategory,
  selections: Selection[],
  componentsById: Map<number, CalcComponent>,
  display: Currency,
  finance: FinanceSettings,
): { total: Priced; days: number } {
  const { total } = calcConfigPrice(category, selections, componentsById, display, finance);
  const { days } = calcConfigDays(category, selections, componentsById);
  return { total, days };
}
