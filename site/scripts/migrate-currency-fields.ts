import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, sqlite } from "../lib/db";
import { settings } from "../drizzle/schema";

// ============================================================
// Миграция v2 (plan-finances2.md D-23б): добавляем колонки валют
// к price-полям. Существующие цены после v1 лежат в USD-центах,
// поэтому маркер заполняем "USD" (без повторной конверсии).
// Свежие БД (seed.ts) сидятся сразу с маркерами валют.
// Запуск: npm run db:migrate-currency (после db:migrate).
// ============================================================

const COLUMNS: Array<[string, string]> = [
  ["categories", "workPriceCurrency"],
  ["products", "priceCurrency"],
  ["components", "priceCurrency"],
  ["components", "processingPriceCurrency"],
  ["orders", "calcPriceCurrency"],
];

function columnExists(table: string, column: string): boolean {
  const rows = db
    .all<{ name: string }>(sql.raw(`PRAGMA table_info(${table})`))
    .map((r) => r.name);
  return rows.includes(column);
}

let added = 0;
for (const [table, column] of COLUMNS) {
  if (columnExists(table, column)) {
    console.log(`${table}.${column}: уже есть — пропускаем`);
    continue;
  }
  db.run(
    sql.raw(
      `ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT 'USD'`,
    ),
  );
  // Явный бэкап-апдейт (гарантирует "USD" даже если default не сработал)
  db.run(sql.raw(`UPDATE ${table} SET ${column} = 'USD' WHERE ${column} IS NULL`));
  added += 1;
  console.log(`${table}.${column}: добавлено (маркер USD)`);
}

console.log(
  `Миграция v2 завершена: добавлено колонок ${added}. Все цены помечены USD ` +
    `(v1 хранил USD-центы). Для свежих БД используйте seed.ts.`,
);

// Конвертация старых границ фильтра (USD-центы) в нативную валюту (D-23b):
// добавляем маркер валюты и пересчитываем миноры. Идемпотентно — только если
// маркера ещё нет. По умолчанию выбираем RUB (исторически границы задавались в ₽).
function getSetting(key: string): string | undefined {
  return db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .get()?.value;
}
function upsertSetting(key: string, value: string): void {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}

if (!getSetting("finance.filterLowCurrency")) {
  // Курс рубля из настроек (по умолчанию 85)
  let rubRate = 85;
  try {
    const arr = JSON.parse(getSetting("finance.currencies") ?? "[]") as unknown[];
    const r = (arr as Array<{ code: string; ratePerUsd: number }>).find(
      (c) => c.code === "RUB",
    );
    if (r && r.ratePerUsd) rubRate = r.ratePerUsd;
  } catch {
    // дефолт
  }
  const toNativeMinor = (usdCents: number) => Math.round(usdCents * rubRate);
  const low = Number(getSetting("finance.filterLow") ?? "0");
  const high = Number(getSetting("finance.filterHigh") ?? "0");
  upsertSetting("finance.filterLow", String(toNativeMinor(low)));
  upsertSetting("finance.filterLowCurrency", "RUB");
  upsertSetting("finance.filterHigh", String(toNativeMinor(high)));
  upsertSetting("finance.filterHighCurrency", "RUB");
  console.log(
    `finance.filterLow/High: USD-центы → рубли (rate ${rubRate}); маркер RUB добавлен.`,
  );
} else {
  console.log("finance.filterLow/High: уже в нативной валюте — пропускаем");
}

sqlite.close();
