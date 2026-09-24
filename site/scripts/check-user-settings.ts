import assert from "node:assert/strict";
import {
  COOKIE_VERSION_KEY,
  CURRENCY_COOKIE_KEY,
  LOCALE_COOKIE_KEY,
  normalizeDefaultCurrency,
  normalizeUserSettingCookies,
  SKIN_COOKIE_KEY,
} from "../lib/user-settings";

const defaults = { locale: "ru", currency: "UAH", skin: "memphis" } as const;
const currencies = ["USD", "UAH", "EUR"];

function check(
  header: string | undefined,
  version: string,
  expected: {
    locale: string;
    currency: string;
    skin: string;
    version: string;
  },
  changes: [string, string][],
  requestCookie?: string,
) {
  const actual = normalizeUserSettingCookies(header, defaults, currencies, version);
  assert.deepEqual(actual.values, expected);
  assert.deepEqual(
    actual.changes.map(({ name, value }) => [name, value]),
    changes,
  );
  if (requestCookie !== undefined) assert.equal(actual.cookieHeader, requestCookie);
}

check(
  undefined,
  "1",
  { locale: "ru", currency: "UAH", skin: "memphis", version: "1" },
  [
    [LOCALE_COOKIE_KEY, "ru"],
    [CURRENCY_COOKIE_KEY, "UAH"],
    [SKIN_COOKIE_KEY, "memphis"],
    [COOKIE_VERSION_KEY, "1"],
  ],
);

const valid =
  `${LOCALE_COOKIE_KEY}=en; ${CURRENCY_COOKIE_KEY}=EUR; ` +
  `${SKIN_COOKIE_KEY}=handmade; ${COOKIE_VERSION_KEY}=7; auth-token=secret`;
check(
  valid,
  "7",
  { locale: "en", currency: "EUR", skin: "handmade", version: "7" },
  [],
  valid,
);

check(
  `${LOCALE_COOKIE_KEY}=en; ${CURRENCY_COOKIE_KEY}=EUR; ` +
    `${SKIN_COOKIE_KEY}=handmade; ${COOKIE_VERSION_KEY}=6`,
  "7",
  { locale: "ru", currency: "UAH", skin: "memphis", version: "7" },
  [
    [LOCALE_COOKIE_KEY, "ru"],
    [CURRENCY_COOKIE_KEY, "UAH"],
    [SKIN_COOKIE_KEY, "memphis"],
    [COOKIE_VERSION_KEY, "7"],
  ],
);

check(
  `${LOCALE_COOKIE_KEY}=fr; ${CURRENCY_COOKIE_KEY}=GBP; ` +
    `${SKIN_COOKIE_KEY}=unknown; ${COOKIE_VERSION_KEY}=7; auth-token=secret`,
  "7",
  { locale: "ru", currency: "UAH", skin: "memphis", version: "7" },
  [
    [LOCALE_COOKIE_KEY, "ru"],
    [CURRENCY_COOKIE_KEY, "UAH"],
    [SKIN_COOKIE_KEY, "memphis"],
  ],
  `${LOCALE_COOKIE_KEY}=ru; ${CURRENCY_COOKIE_KEY}=UAH; ` +
    `${SKIN_COOKIE_KEY}=memphis; ${COOKIE_VERSION_KEY}=7; auth-token=secret`,
);

check(
  `${LOCALE_COOKIE_KEY}=EN; ${CURRENCY_COOKIE_KEY}=eur; ` +
    `${SKIN_COOKIE_KEY}=HANDMADE; ${COOKIE_VERSION_KEY}=7`,
  "7",
  { locale: "ru", currency: "EUR", skin: "handmade", version: "7" },
  [
    [LOCALE_COOKIE_KEY, "ru"],
    [CURRENCY_COOKIE_KEY, "EUR"],
    [SKIN_COOKIE_KEY, "handmade"],
  ],
);

assert.equal(normalizeDefaultCurrency("usd", currencies, "UAH"), "USD");
assert.equal(normalizeDefaultCurrency("GBP", currencies, "UAH"), "UAH");
assert.equal(normalizeDefaultCurrency("INVALID", currencies, "UAH"), "UAH");

const leadingZeroVersion = normalizeUserSettingCookies(
  `${LOCALE_COOKIE_KEY}=en; ${CURRENCY_COOKIE_KEY}=USD; ` +
    `${SKIN_COOKIE_KEY}=handmade; ${COOKIE_VERSION_KEY}=007`,
  defaults,
  currencies,
  "7",
);
assert.deepEqual(leadingZeroVersion.values, {
  locale: "en",
  currency: "USD",
  skin: "handmade",
  version: "7",
});
assert.deepEqual(
  leadingZeroVersion.changes.map(({ name, value }) => [name, value]),
  [[COOKIE_VERSION_KEY, "7"]],
);

console.log("OK cookie-only user settings");
