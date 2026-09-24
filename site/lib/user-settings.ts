export const LOCALE_COOKIE_KEY = "julcraft-locale";
export const CURRENCY_COOKIE_KEY = "julcraft-currency";
export const SKIN_COOKIE_KEY = "julcraft-skin";
export const COOKIE_VERSION_KEY = "julcraft-cookies-version";

export const USER_COOKIE_KEYS = [
  LOCALE_COOKIE_KEY,
  CURRENCY_COOKIE_KEY,
  SKIN_COOKIE_KEY,
  COOKIE_VERSION_KEY,
] as const;

export const USER_COOKIE_MAX_AGE = 31_536_000;

export type UserLocale = "ru" | "en" | "uk";
export type UserSkin = "memphis" | "handmade";

export type UserSettingValues = {
  locale: UserLocale;
  currency: string;
  skin: UserSkin;
  version: string;
};

export type UserSettingDefaults = Omit<UserSettingValues, "version">;

export type UserSettingCookieChange = {
  name: (typeof USER_COOKIE_KEYS)[number];
  value: string;
};

export type UserSettingNormalization = {
  values: UserSettingValues;
  changes: UserSettingCookieChange[];
  cookieHeader: string;
};

export const USER_COOKIE_OPTIONS = {
  path: "/",
  maxAge: USER_COOKIE_MAX_AGE,
  sameSite: "lax",
} as const;

const LOCALES: readonly UserLocale[] = ["ru", "en", "uk"];
const SKINS: readonly UserSkin[] = ["memphis", "handmade"];
const CURRENCY_RE = /^[A-Z]{3}$/;
const VERSION_RE = /^\d+$/;

export function isLocale(value: string | undefined): value is UserLocale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function isSkin(value: string | undefined): value is UserSkin {
  return value !== undefined && (SKINS as readonly string[]).includes(value);
}

export function isCurrency(value: string, codes: readonly string[]): boolean {
  return CURRENCY_RE.test(value) && codes.includes(value);
}

export function isCookieVersion(value: string | undefined): boolean {
  return value !== undefined && VERSION_RE.test(value);
}

export function normalizeDefaultLocale(value: string | undefined): UserLocale {
  return isLocale(value) ? value : "ru";
}

export function normalizeDefaultSkin(value: string | undefined): UserSkin {
  return value === "handmade" ? "handmade" : "memphis";
}

export function normalizeDefaultCurrency(
  value: string | undefined,
  codes: readonly string[],
  fallback: string,
): string {
  const normalized = value?.trim().toUpperCase();
  if (normalized && isCurrency(normalized, codes)) return normalized;
  return isCurrency(fallback, codes) ? fallback : codes[0] ?? "USD";
}

export function getCookieVersion(value: string | undefined): string {
  if (value === undefined || !isCookieVersion(value)) return "1";
  return value.replace(/^0+(?=\d)/, "");
}

function readCookieValues(cookieHeader: string | null | undefined): Map<string, string> {
  const values = new Map<string, string>();
  if (!cookieHeader) return values;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name || values.has(name)) continue;
    try {
      values.set(name, decodeURIComponent(value));
    } catch {
      values.set(name, value);
    }
  }
  return values;
}

function serializeCookieValues(values: Map<string, string>): string {
  return [...values.entries()]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

function setCookieValue(
  values: Map<string, string>,
  changes: UserSettingCookieChange[],
  name: (typeof USER_COOKIE_KEYS)[number],
  rawValue: string,
  fallback: string,
  isValid: (value: string) => boolean,
  normalize: (value: string) => string,
): void {
  const value = isValid(rawValue) ? normalize(rawValue) : fallback;
  if (values.get(name) !== value) {
    values.set(name, value);
    changes.push({ name, value });
  }
}

export function normalizeUserSettingCookies(
  cookieHeader: string | null | undefined,
  defaults: UserSettingDefaults,
  currencyCodes: readonly string[],
  expectedVersion: string,
): UserSettingNormalization {
  const incoming = readCookieValues(cookieHeader);
  const values = new Map(incoming);
  const changes: UserSettingCookieChange[] = [];
  const version = getCookieVersion(expectedVersion);
  const incomingVersion = getCookieVersion(incoming.get(COOKIE_VERSION_KEY));
  const versionMatches =
    isCookieVersion(incoming.get(COOKIE_VERSION_KEY)) && incomingVersion === version;

  if (!versionMatches) {
    values.set(LOCALE_COOKIE_KEY, defaults.locale);
    values.set(CURRENCY_COOKIE_KEY, defaults.currency);
    values.set(SKIN_COOKIE_KEY, defaults.skin);
    values.set(COOKIE_VERSION_KEY, version);
    changes.push(
      { name: LOCALE_COOKIE_KEY, value: defaults.locale },
      { name: CURRENCY_COOKIE_KEY, value: defaults.currency },
      { name: SKIN_COOKIE_KEY, value: defaults.skin },
      { name: COOKIE_VERSION_KEY, value: version },
    );
    return {
      values: { ...defaults, version },
      changes,
      cookieHeader: serializeCookieValues(values),
    };
  }

  setCookieValue(
    values,
    changes,
    LOCALE_COOKIE_KEY,
    incoming.get(LOCALE_COOKIE_KEY) ?? "",
    defaults.locale,
    (value) => isLocale(value),
    (value) => value,
  );
  setCookieValue(
    values,
    changes,
    CURRENCY_COOKIE_KEY,
    incoming.get(CURRENCY_COOKIE_KEY) ?? "",
    defaults.currency,
    (value) => isCurrency(value.toUpperCase(), currencyCodes),
    (value) => value.toUpperCase(),
  );
  setCookieValue(
    values,
    changes,
    SKIN_COOKIE_KEY,
    incoming.get(SKIN_COOKIE_KEY) ?? "",
    defaults.skin,
    (value) => isSkin(value.toLowerCase() as UserSkin),
    (value) => value.toLowerCase() as UserSkin,
  );
  setCookieValue(
    values,
    changes,
    COOKIE_VERSION_KEY,
    incoming.get(COOKIE_VERSION_KEY) ?? "",
    version,
    (value) => isCookieVersion(value),
    (value) => getCookieVersion(value),
  );

  return {
    values: {
      locale: values.get(LOCALE_COOKIE_KEY) as UserLocale,
      currency: values.get(CURRENCY_COOKIE_KEY) as string,
      skin: values.get(SKIN_COOKIE_KEY) as UserSkin,
      version: values.get(COOKIE_VERSION_KEY) as string,
    },
    changes,
    cookieHeader: serializeCookieValues(values),
  };
}
