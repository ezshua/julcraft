import { db } from "./db";
import { settings as settingsTable } from "../drizzle/schema";
import { defaultSettings, type SiteSettings } from "./settings";
import { parseFinance } from "./currency";
import { type LocalizedString } from "./localize";

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Извлекает LocalizedString из строки, которая может быть legacy string,
// {"ru":"..."} или {"ru":..,"en":..,"uk":..}. Legacy/plain — как есть.
function extractLS(raw: string | undefined, fallback: LocalizedString): LocalizedString {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      ("ru" in parsed || "en" in parsed || "uk" in parsed)
    ) {
      return parsed as Partial<Record<"ru" | "en" | "uk", string>>;
    }
    return raw;
  } catch {
    return raw;
  }
}

// Рекурсивно превращает строковые поля в LocalizedString (legacy/plain — как есть).
function extractLocalized(obj: unknown): unknown {
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        ("ru" in parsed || "en" in parsed || "uk" in parsed)
      ) {
        return parsed as Partial<Record<"ru" | "en" | "uk", string>>;
      }
      if (typeof parsed === "string") return parsed;
    } catch {
      // Не JSON — обычная строка
    }
    return obj;
  }
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(extractLocalized);
  if ("ru" in obj || "en" in obj || "uk" in obj) {
    return obj as Partial<Record<"ru" | "en" | "uk", string>>;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = extractLocalized(value);
  }
  return result;
}

export function getSettings(): SiteSettings {
  const rows = db.select().from(settingsTable).all();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    contacts: {
      phone: map.get("contacts.phone") ?? defaultSettings.contacts.phone,
      email: map.get("contacts.email") ?? defaultSettings.contacts.email,
      address: extractLS(
        map.get("contacts.address"),
        defaultSettings.contacts.address,
      ),
      telegram: map.get("contacts.telegram") ?? defaultSettings.contacts.telegram,
      instagram: map.get("contacts.instagram") ?? defaultSettings.contacts.instagram,
      hours: extractLocalized(
        parse(map.get("contacts.hours"), defaultSettings.contacts.hours),
      ) as typeof defaultSettings.contacts.hours,
    },
    about: {
      short: extractLocalized(
        parse(map.get("about.short"), defaultSettings.about.short),
      ) as typeof defaultSettings.about.short,
      history: extractLocalized(
        parse(map.get("about.history"), defaultSettings.about.history),
      ) as typeof defaultSettings.about.history,
      principles: extractLocalized(
        parse(map.get("about.principles"), defaultSettings.about.principles),
      ) as typeof defaultSettings.about.principles,
    },
    telegram: {
      botToken: map.get("telegram.botToken") ?? "",
      chatId: map.get("telegram.chatId") ?? "",
    },
    finance: parseFinance(
      map.get("finance.currencies"),
      map.get("finance.defaultCurrency"),
      map.get("finance.filterLow"),
      map.get("finance.filterHigh"),
      map.get("finance.filterLowCurrency"),
      map.get("finance.filterHighCurrency"),
    ),
  };
}