// Вычисление абсолютного пути к файлу SQLite-БД без её открытия.
// Используется lib/db.ts и скриптами снапшота (plan-snapshot.md Шаг 0).

import { resolve } from "node:path";

function resolveDbPath(url: string): string {
  if (!url.startsWith("file:")) return url;
  return resolve(process.cwd(), url.slice("file:".length));
}

export function getDbPath(): string {
  return resolveDbPath(process.env.DATABASE_URL ?? "file:./julcraft.db");
}
