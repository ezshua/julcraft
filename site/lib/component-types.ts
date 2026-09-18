import "server-only";
import { asc } from "drizzle-orm";
import { db } from "./db";
import {
  COMPONENT_TYPES,
  componentTypes,
  type ComponentTypeRow,
} from "../drizzle/schema";
import { L, type LocalizedString } from "./localize";
import type { Locale } from "./i18n";

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

// Fallback-подписи типов («Камень/Подвеска/…») — RU-значения по коду.
// Используются и в витрине — конфигуратор; админские места до i18n-4
// продолжают RU. Коды — стабильные идентификаторы, не зависят от языка.
const TYPE_FALLBACK_LABELS: Record<string, LocalizedString> = {
  stone: { ru: "Камень", en: "Stone", uk: "Камінь" },
  pendant: { ru: "Подвеска", en: "Pendant", uk: "Підвіска" },
  bead: { ru: "Бусина", en: "Bead", uk: "Бусина" },
  cord: { ru: "Шнур и цепь", en: "Cord and chain", uk: "Шнур і ланцюг" },
  clasp: { ru: "Застёжка", en: "Clasp", uk: "Застібка" },
  base: { ru: "Основа", en: "Base", uk: "Основа" },
};

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
 * Вывод — через L(): строка из БД (localized) или fallback-подпись на локаль.
 */
export function getTypeLabel(code: string, locale: Locale): string {
  const found = getComponentTypes().find((t) => t.code === code);
  if (found) return L(found.name, locale);
  return L(TYPE_FALLBACK_LABELS[code], locale) || code;
}

/** Существует ли такой код типа (активность не важна). */
export function isValidComponentTypeCode(code: string): boolean {
  return getComponentTypes().some((t) => t.code === code);
}
