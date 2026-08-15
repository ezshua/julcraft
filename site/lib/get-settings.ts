import { db } from "./db";
import { settings as settingsTable } from "../drizzle/schema";
import { defaultSettings, type SiteSettings } from "./settings";

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getSettings(): SiteSettings {
  const rows = db.select().from(settingsTable).all();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    contacts: {
      phone: map.get("contacts.phone") ?? defaultSettings.contacts.phone,
      email: map.get("contacts.email") ?? defaultSettings.contacts.email,
      address: map.get("contacts.address") ?? defaultSettings.contacts.address,
      telegram: map.get("contacts.telegram") ?? defaultSettings.contacts.telegram,
      instagram: map.get("contacts.instagram") ?? defaultSettings.contacts.instagram,
      hours: parse(map.get("contacts.hours"), defaultSettings.contacts.hours),
    },
    about: {
      short: parse(map.get("about.short"), defaultSettings.about.short),
      history: parse(map.get("about.history"), defaultSettings.about.history),
      principles: parse(map.get("about.principles"), defaultSettings.about.principles),
    },
    telegram: {
      botToken: map.get("telegram.botToken") ?? "",
      chatId: map.get("telegram.chatId") ?? "",
    },
  };
}
