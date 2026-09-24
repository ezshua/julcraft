import { NextResponse, type NextRequest } from "next/server";
import { getSettings } from "@/lib/get-settings";
import {
  getCookieVersion,
  normalizeDefaultCurrency,
  normalizeDefaultLocale,
  normalizeDefaultSkin,
  normalizeUserSettingCookies,
  USER_COOKIE_OPTIONS,
} from "@/lib/user-settings";

export function proxy(request: NextRequest) {
  const { finance } = getSettings();
  const currencyCodes = finance.currencies.map((currency) => currency.code);
  const defaultCurrency = normalizeDefaultCurrency(
    process.env.DEFAULT_CURRENCY,
    currencyCodes,
    finance.defaultCurrency,
  );
  const normalization = normalizeUserSettingCookies(
    request.headers.get("cookie"),
    {
      locale: normalizeDefaultLocale(process.env.DEFAULT_LOCALE),
      currency: defaultCurrency,
      skin: normalizeDefaultSkin(process.env.DEFAULT_SKIN),
    },
    currencyCodes,
    getCookieVersion(process.env.DEFAULT_COOKIESID),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", normalization.cookieHeader);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  for (const change of normalization.changes) {
    response.cookies.set(change.name, change.value, USER_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
