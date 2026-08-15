import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "../lib/db";

migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });

sqlite.close();
