import { eq } from "drizzle-orm";
import { db, sqlite } from "../lib/db";
import { settings } from "../drizzle/schema";
import { L, firstLocale, type LocalizedString } from "../lib/localize";

// ============================================================
// i18n-2 · Шаг 2: Миграция данных БД в {ru:...}
// Конвертирует legacy-строки в {"ru": "..."} для всех текстовых
// полей контента и настроек. Идемпотентно: повторный запуск — no-op.
// Валидация после записи: каждое значение парсится и
// L(v, "ru") === исходная строка.
// ============================================================

const LOCALE = "ru" as const;

// --- Helpers ---

function isLocalized(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      ("ru" in parsed || "en" in parsed || "uk" in parsed)
    );
  } catch {
    return false;
  }
}

function wrapLocalized(value: string): string {
  if (isLocalized(value)) return value;
  return JSON.stringify({ ru: value });
}

function validateLocale(original: string, stored: string): boolean {
  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed === "string") return parsed === original;
    return L(parsed as LocalizedString, LOCALE) === original;
  } catch {
    return false;
  }
}

function localizeJson(value: unknown, textFields: Set<string>, key?: string): unknown {
  if (typeof value === "string") {
    if (key && textFields.has(key)) {
      try {
        const parsed = JSON.parse(value);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed) &&
          ("ru" in parsed || "en" in parsed || "uk" in parsed)
        ) {
          return parsed;
        }
      } catch {
        // Не JSON — обычная строка
      }
      return { ru: value };
    }
    return value;
  }
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => localizeJson(v, textFields));
  }
  if ("ru" in value || "en" in value || "uk" in value) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    result[k] = localizeJson(v, textFields, k);
  }
  return result;
}

interface TextOccurrence {
  path: string;
  value: string;
}

function collectTextValues(
  obj: unknown,
  textFields: Set<string>,
  basePath: string,
  key?: string,
): TextOccurrence[] {
  if (key && textFields.has(key)) {
    if (typeof obj === "string") {
      return [{ path: basePath, value: obj }];
    }
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      return [{ path: basePath, value: firstLocale(obj as LocalizedString) }];
    }
    return [];
  }
  if (obj === null || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) =>
      collectTextValues(v, textFields, `${basePath}[${i}]`),
    );
  }
  const result: TextOccurrence[] = [];
  for (const [k, v] of Object.entries(obj)) {
    result.push(...collectTextValues(v, textFields, `${basePath}.${k}`, k));
  }
  return result;
}

// --- Content table migration ---

const CONTENT_CONFIG: Array<[string, string]> = [
  ["categories", "name"],
  ["categories", "description"],
  ["slotTemplates", "name"],
  ["componentTypes", "name"],
  ["components", "name"],
  ["products", "name"],
  ["products", "description"],
  ["products", "metaTitle"],
  ["products", "metaDescription"],
];

let totalChanged = 0;

for (const [table, column] of CONTENT_CONFIG) {
  const rows = sqlite
    .prepare(`SELECT id, ${column} FROM ${table}`)
    .all() as Array<{ id: number; [k: string]: unknown }>;
  let changed = 0;

  for (const row of rows) {
    const val = row[column];
    if (typeof val === "string" && !isLocalized(val)) {
      const original = val;
      const migrated = wrapLocalized(val);
      sqlite
        .prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`)
        .run(migrated, row.id);

      // Валидация: L(v, "ru") === исходная строка
      const after = sqlite
        .prepare(`SELECT ${column} FROM ${table} WHERE id = ?`)
        .get(row.id) as { [k: string]: unknown } | undefined;
      if (!after) {
        throw new Error(`Validation failed: ${table}.${column} id=${row.id} — строка не найдена после записи`);
      }
      const stored = after[column] as string;
      if (!validateLocale(original, stored)) {
        throw new Error(`Validation failed: ${table}.${column} id=${row.id}`);
      }
      changed += 1;
    }
  }

  console.log(`${table}: обработано ${rows.length} строк, изменено ${changed}`);
  totalChanged += changed;
}

// --- Settings migration ---

const SIMPLE_SETTINGS = ["contacts.address"];

for (const key of SIMPLE_SETTINGS) {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) {
    console.log(`${key}: не найден в БД, пропущен`);
    continue;
  }
  const val = row.value;
  if (typeof val === "string" && !isLocalized(val)) {
    const original = val;
    const migrated = wrapLocalized(val);
    db.update(settings)
      .set({ value: migrated })
      .where(eq(settings.key, key))
      .run();
    if (!validateLocale(original, migrated)) {
      throw new Error(`Validation failed: settings.${key}`);
    }
    totalChanged += 1;
    console.log(`${key}: мигрировано`);
  } else {
    console.log(`${key}: уже локализовано, пропущено`);
  }
}

const JSON_SETTINGS: Array<{ key: string; textFields: string[] }> = [
  { key: "contacts.hours", textFields: ["day", "value"] },
  { key: "about.short", textFields: ["label", "value", "thanks"] },
  { key: "about.history", textFields: ["label", "value", "thanks"] },
  { key: "about.principles", textFields: ["title", "text"] },
  { key: "finance.currencies", textFields: ["name"] },
];

for (const { key, textFields } of JSON_SETTINGS) {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) {
    console.log(`${key}: не найден в БД, пропущен`);
    continue;
  }

  let originalParsed: unknown;
  try {
    originalParsed = JSON.parse(row.value);
  } catch {
    console.log(`${key}: значение не является JSON, пропущено`);
    continue;
  }

  const fieldSet = new Set(textFields);
  const newJson = localizeJson(originalParsed, fieldSet);
  const newSerialized = JSON.stringify(newJson);

  if (newSerialized !== row.value) {
    const originalTexts = collectTextValues(originalParsed, fieldSet, key);
    db.update(settings)
      .set({ value: newSerialized })
      .where(eq(settings.key, key))
      .run();

    // Валидация: L(v, "ru") === исходная строка для каждого текстового поля
    const after = db.select().from(settings).where(eq(settings.key, key)).get();
    if (!after) {
      throw new Error(`Validation failed: settings.${key} — строка не найдена после записи`);
    }
    const migratedParsed = JSON.parse(after.value);
    const migratedTexts = collectTextValues(migratedParsed, fieldSet, key);

    if (originalTexts.length !== migratedTexts.length) {
      throw new Error(
        `Validation failed: ${key} — ${originalTexts.length} текстовых полей, после миграции ${migratedTexts.length}`,
      );
    }

    for (let i = 0; i < originalTexts.length; i++) {
      if (originalTexts[i].value !== migratedTexts[i].value) {
        throw new Error(
          `Validation failed: ${originalTexts[i].path} — ожидалось "${originalTexts[i].value}", получено "${migratedTexts[i].value}"`,
        );
      }
    }

    totalChanged += 1;
    console.log(`${key}: мигрировано (${originalTexts.length} текстовых полей)`);
  } else {
    console.log(`${key}: уже локализовано, пропущено`);
  }
}

console.log(`\nМиграция завершена: изменено ${totalChanged} значений.`);
sqlite.close();
