import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries/ru";
import { ru } from "@/lib/dictionaries/ru";
import { en } from "@/lib/dictionaries/en";
import { uk } from "@/lib/dictionaries/uk";
import type { OrderStatus } from "@/drizzle/schema";

// Подписи статусов заявки per-locale для UI — единый маппинг для тегов в таблице, заголовка модалки и т. п.
// В БД и API ключи остаются английскими (new / in_progress / done / cancelled).
const LABELS_BY_LOCALE: Record<Locale, Dictionary> = { ru, en, uk };

export function getOrderStatusLabels(
  locale: Locale,
): Record<OrderStatus, string> {
  return LABELS_BY_LOCALE[locale].admin.statusLabels;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> =
  getOrderStatusLabels("ru");