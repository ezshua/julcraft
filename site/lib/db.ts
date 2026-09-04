import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import "dotenv/config";
import { getDbPath } from "./db-path";

export const sqlite = new Database(getDbPath());

export const db = drizzle(sqlite);
