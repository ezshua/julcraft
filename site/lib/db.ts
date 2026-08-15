import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import "dotenv/config";
import { resolve } from "node:path";

function resolveDbPath(url: string): string {
  if (!url.startsWith("file:")) return url;
  return resolve(process.cwd(), url.slice("file:".length));
}

export const sqlite = new Database(
  resolveDbPath(process.env.DATABASE_URL ?? "file:./julcraft.db"),
);

export const db = drizzle(sqlite);
