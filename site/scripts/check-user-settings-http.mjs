import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const ROOT = "http://127.0.0.1:3107";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3107"], {
  env: {
    ...process.env,
    DEFAULT_COOKIESID: "1",
    DEFAULT_CURRENCY: "UAH",
    DEFAULT_LOCALE: "uk",
    DEFAULT_SKIN: "memphis",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

function check(condition, message) {
  assert.ok(condition, message);
  console.log(`OK ${message}`);
}

function get(cookie) {
  return fetch(ROOT + "/", cookie ? { headers: { cookie } } : undefined);
}

function setCookies(response) {
  return response.headers.getSetCookie();
}

function cookieMap(response) {
  return new Map(setCookies(response).map((line) => {
    const [pair] = line.split(";");
    const separator = pair.indexOf("=");
    return [pair.slice(0, separator), pair.slice(separator + 1)];
  }));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await get();
      await response.text();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Next.js did not start on port 3107");
}

try {
  await waitForServer();

  const first = await get();
  check(first.ok, "production response is available");
  const firstHtml = await first.text();
  check(firstHtml.includes('<html lang="uk">'), "first SSR uses DEFAULT_LOCALE");
  check(firstHtml.includes('href="/css/style-memphis.css"'), "first SSR uses DEFAULT_SKIN");
  const firstCookies = cookieMap(first);
  check(firstCookies.get("julcraft-locale") === "uk", "first response sets locale cookie");
  check(firstCookies.get("julcraft-currency") === "UAH", "first response sets currency cookie");
  check(firstCookies.get("julcraft-skin") === "memphis", "first response sets skin cookie");
  check(firstCookies.get("julcraft-cookies-version") === "1", "first response sets version cookie");

  const validCookie = "julcraft-locale=en; julcraft-currency=USD; julcraft-skin=handmade; julcraft-cookies-version=1; auth-token=secret";
  const valid = await get(validCookie);
  const validHtml = await valid.text();
  check(validHtml.includes('<html lang="en">'), "valid locale is rendered by SSR");
  check(validHtml.includes('href="/css/style.css"'), "valid skin is rendered by SSR");
  check(validHtml.includes("$"), "valid currency is rendered by SSR");
  check(setCookies(valid).length === 0, "valid cookies are not rewritten");

  const reset = await get("julcraft-locale=en; julcraft-currency=USD; julcraft-skin=handmade; julcraft-cookies-version=0");
  const resetHtml = await reset.text();
  const resetCookies = cookieMap(reset);
  check(resetHtml.includes('<html lang="uk">'), "version reset uses defaults in the same SSR");
  check(resetHtml.includes('href="/css/style-memphis.css"'), "version reset uses default skin in the same SSR");
  check(resetCookies.get("julcraft-locale") === "uk", "version reset rewrites locale");
  check(resetCookies.get("julcraft-currency") === "UAH", "version reset rewrites currency");
  check(resetCookies.get("julcraft-skin") === "memphis", "version reset rewrites skin");
  check(resetCookies.get("julcraft-cookies-version") === "1", "version reset rewrites version");

  const partial = await get("julcraft-locale=fr; julcraft-currency=GBP; julcraft-skin=handmade; julcraft-cookies-version=1; auth-token=secret");
  const partialHtml = await partial.text();
  const partialCookies = cookieMap(partial);
  check(partialHtml.includes('<html lang="uk">'), "invalid locale uses default in SSR");
  check(partialHtml.includes('href="/css/style.css"'), "valid skin survives independent invalid values");
  check(partialCookies.get("julcraft-locale") === "uk", "invalid locale is rewritten");
  check(partialCookies.get("julcraft-currency") === "UAH", "invalid currency is rewritten");
  check(!setCookies(partial).some((line) => line.startsWith("julcraft-skin=")), "valid skin is not rewritten");
  check(!setCookies(partial).some((line) => line.startsWith("julcraft-cookies-version=")), "valid version is not rewritten");

  console.log("OK HTTP cookie normalization");
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit");
  }
}
