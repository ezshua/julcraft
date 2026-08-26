// Базовый URL сайта для metadataBase/OG/sitemap (решение №1, Этап 6).
// Реальный домен вписывается в SITE_URL при деплое; fallback — локальный запуск.
export function siteUrl(): string {
  const raw = process.env.SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
