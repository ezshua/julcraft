import type { OrderStatus } from "@/drizzle/schema";

// Русские подписи для UI — единый маппинг для тегов в таблице, заголовка модалки и т. п.
// В БД и API ключи остаются английскими (new / in_progress / done / cancelled).
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Готово",
  cancelled: "Отменено",
};
