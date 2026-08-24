import "server-only";
import { asc } from "drizzle-orm";
import { db } from "./db";
import {
  COMPONENT_TYPES,
  componentTypes,
  type ComponentTypeRow,
} from "../drizzle/schema";

// Доступ к редактируемым типам комплектующих (план componentsExt).
// Источник истины — таблица componentTypes; при пустой таблице (до сида)
// используется fallback-набор COMPONENT_TYPES, чтобы сайт не падал.

// Fallback-строки для пустой таблицы: коды исторические, подписи — как в сиде.
const FALLBACK_ROWS: ComponentTypeRow[] = COMPONENT_TYPES.map((code, i) => ({
  id: -(i + 1),
  code,
  name: code,
  sortOrder: i,
  isActive: true,
}));

// Базовые типы сида: их нельзя удалять через API, в UI помечены как неудаляемые.
export const BASE_COMPONENT_TYPE_CODES: ReadonlySet<string> = new Set([
  "stone",
  "pendant",
  "bead",
  "cord",
  "clasp",
  "base",
]);

/** Все типы по порядку сортировки (включая неактивные). */
export function getComponentTypes(): ComponentTypeRow[] {
  const rows = db
    .select()
    .from(componentTypes)
    .orderBy(asc(componentTypes.sortOrder), asc(componentTypes.id))
    .all();
  return rows.length > 0 ? rows : FALLBACK_ROWS;
}

/** Только активные типы — для выпадающих списков при создании новых записей. */
export function getActiveComponentTypes(): ComponentTypeRow[] {
  return getComponentTypes().filter((t) => t.isActive);
}

/**
 * Подпись типа по коду. Неизвестный/удалённый код не ломает вывод —
 * показываем сам код (исторические данные остаются читаемыми).
 */
export function getTypeLabel(code: string): string {
  const found = getComponentTypes().find((t) => t.code === code);
  return found ? found.name : code;
}

/** Существует ли такой код типа (активность не важна). */
export function isValidComponentTypeCode(code: string): boolean {
  return getComponentTypes().some((t) => t.code === code);
}
