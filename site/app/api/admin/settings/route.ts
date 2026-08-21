import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings as settingsTable } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/get-settings";
import { validateFinanceSettings } from "@/lib/currency";

const KNOWN_KEYS = new Set([
  "contacts.phone",
  "contacts.email",
  "contacts.address",
  "contacts.telegram",
  "contacts.instagram",
  "contacts.hours",
  "about.short",
  "about.history",
  "about.principles",
  "telegram.botToken",
  "telegram.chatId",
  "finance.currencies",
  "finance.defaultCurrency",
  "finance.filterLow",
  "finance.filterLowCurrency",
  "finance.filterHigh",
  "finance.filterHighCurrency",
]);

// JSON-поля валидируются парсингом при сохранении.
const JSON_KEYS = new Set([
  "contacts.hours",
  "about.short",
  "about.history",
  "about.principles",
  "finance.currencies",
]);

const itemSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// Все настройки для формы.
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }
  return Response.json(getSettings());
}

// Сохранение массива {key, value} — только известные ключи; JSON-поля парсятся.
export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : (body as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Передайте массив {key, value}" }, { status: 400 });
  }

  for (const raw of items) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ error: "Некорректный элемент {key, value}" }, { status: 400 });
    }
    const { key, value } = parsed.data;
    if (!KNOWN_KEYS.has(key)) {
      return Response.json({ error: `Неизвестный ключ: ${key}` }, { status: 400 });
    }
    if (JSON_KEYS.has(key)) {
      try {
        JSON.parse(value);
      } catch {
        return Response.json({ error: `Ключ «${key}» должен быть JSON` }, { status: 400 });
      }
    }
  }

  // Кросс-валидация finance.*: применяем элементы к текущим настройкам в памяти
  const currentRows = db.select().from(settingsTable).all();
  const map = new Map(currentRows.map((r) => [r.key, r.value]));
  for (const raw of items) {
    const { key, value } = itemSchema.parse(raw);
    map.set(key, value);
  }
  let currencies: unknown;
  try {
    currencies = map.has("finance.currencies")
      ? (JSON.parse(map.get("finance.currencies")!) as unknown)
      : undefined;
  } catch {
    currencies = undefined;
  }
  const financeErr = validateFinanceSettings(
    currencies,
    map.get("finance.defaultCurrency"),
    map.has("finance.filterLow")
      ? {
          priceMinor: Number(map.get("finance.filterLow")),
          priceCurrency: map.get("finance.filterLowCurrency") ?? "USD",
        }
      : undefined,
    map.has("finance.filterHigh")
      ? {
          priceMinor: Number(map.get("finance.filterHigh")),
          priceCurrency: map.get("finance.filterHighCurrency") ?? "USD",
        }
      : undefined,
  );
  if (financeErr) {
    return Response.json({ error: financeErr }, { status: 400 });
  }

  // D-27: если из списка валют удалили код (не USD) — пересчитываем все цены
  // в этой валюте в доллары (USD) перед сохранением списка.
  if (map.has("finance.currencies")) {
    const oldCurrencies = (() => {
      const raw = currentRows.find((r) => r.key === "finance.currencies")?.value;
      try {
        return (raw ? JSON.parse(raw) : []) as { code: string; ratePerUsd: number }[];
      } catch {
        return [] as { code: string; ratePerUsd: number }[];
      }
    })();
    const newCurrencies = (currencies as { code: string; ratePerUsd: number }[]) ?? [];
    const newCodes = new Set(newCurrencies.map((c) => c.code));
    const removed = oldCurrencies.filter(
      (c) => c.code !== "USD" && !newCodes.has(c.code),
    );
    for (const rem of removed) {
      const rate = rem.ratePerUsd;
      if (!rate) continue;
      const pairs: [string, string][] = [
        ["products", "priceCurrency"],
        ["categories", "workPriceCurrency"],
        ["components", "priceCurrency"],
        ["components", "processingPriceCurrency"],
        ["orders", "calcPriceCurrency"],
      ];
      for (const [table, curCol] of pairs) {
        const priceCol = curCol.replace("Currency", "");
        db.run(
          sql.raw(
            `UPDATE ${table} SET ${priceCol} = CAST(ROUND(${priceCol} / ${rate}) AS INTEGER), ${curCol} = 'USD' WHERE ${curCol} = '${rem.code}'`,
          ),
        );
      }
    }
  }

  for (const raw of items) {
    const { key, value } = itemSchema.parse(raw);
    const existing = db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .get();
    if (existing) {
      db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key)).run();
    } else {
      db.insert(settingsTable).values({ key, value }).run();
    }
  }

  return Response.json({ ok: true });
}