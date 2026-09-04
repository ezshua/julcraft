import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import "dotenv/config";
import { getDbPath } from "../lib/db-path";

// ============================================================
// snapshot:restore (plan-snapshot.md Шаг 2)
// Разворачивает состояние из артефака snapshot:capture:
//   npm run snapshot:restore -- <путь к zip>
//   npm run snapshot:restore            (свежайший julcraft-snapshot-*.zip в cwd)
// Поверх существующей БД — только с флагом --force (перед этим
// автобэкап старой БД в julcraft.db.bak-<ts> и удаление -wal/-shm).
// Восстановление выполняйте при ОСТАНОВЛЕННОМ приложении.
// .env снапшотом не восстанавливается (ADMIN-доступы, DATABASE_URL,
// SITE_URL — см. docs/deploy-snapshot.md).
// ============================================================

const SUPPORTED_FORMAT_VERSION = 1;
const UPLOAD_PREFIX = "public/uploads/";

function fail(message: string): never {
  console.error(`ОШИБКА: ${message}`);
  process.exit(1);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function findLatestSnapshot(): string {
  const cwd = process.cwd();
  let candidates: string[] = [];
  try {
    candidates = readdirSync(cwd).filter(
      (f) => f.startsWith("julcraft-snapshot-") && f.endsWith(".zip"),
    );
  } catch {
    /* cwd читается всегда — на всякий случай пусто */
  }
  if (candidates.length === 0) {
    fail(
      `в ${cwd} не найдено артефактов julcraft-snapshot-*.zip — укажите путь: npm run snapshot:restore -- <path>`,
    );
  }
  const sorted = candidates.sort();
  const latest = sorted[sorted.length - 1];
  console.log(`Артефакт не указан — выбран свежайший: ${latest}`);
  return join(cwd, latest);
}

interface Manifest {
  formatVersion: number;
  createdAt: string;
  gitCommit: string | null;
  db: {
    sha256: string;
    bytes: number;
    tables: Record<string, number>;
    migrationsApplied: number;
  };
  uploads: {
    files: number;
    bytes: number;
    byFolder: Record<string, { files: number; bytes: number }>;
  };
  warnings: string[];
}

function main(): void {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const zipArg = args.find((a) => !a.startsWith("--"));

  const zipPath = zipArg ? resolve(zipArg) : findLatestSnapshot();
  if (!existsSync(zipPath)) {
    fail(`файл артефакта не найден: ${zipPath}`);
  }

  const zip = new AdmZip(zipPath);
  const manifestEntry = zip.getEntry("manifest.json");
  if (!manifestEntry) {
    fail("в артефакте нет manifest.json — это не снапшот JulCraft");
  }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(zip.readAsText("manifest.json")) as Manifest;
  } catch (e) {
    fail(`manifest.json не читается/не парсится: ${(e as Error).message}`);
  }
  if (manifest?.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    fail(
      `версия формата снапшота ${manifest?.formatVersion} не поддерживается (ожидается ${SUPPORTED_FORMAT_VERSION})`,
    );
  }
  const dbBuf = zip.readFile("julcraft.db");
  if (!dbBuf) {
    fail("в артефакте нет julcraft.db");
  }

  const dbPath = getDbPath();
  const dbExists = existsSync(dbPath);

  // --- Чистый сервер vs поверх существующего ---
  if (dbExists && !force) {
    fail(
      `БД уже существует (${dbPath}). Для восстановления поверх используйте --force (старая БД будет сохранена как julcraft.db.bak-*)`,
    );
  }
  if (dbExists) {
    const now = new Date();
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const bak = `${dbPath}.bak-${ts}`;
    renameSync(dbPath, bak);
    console.log(`Автобэкап существующей БД: ${bak}`);
    for (const side of ["-wal", "-shm"]) {
      const p = `${dbPath}${side}`;
      if (existsSync(p)) {
        unlinkSync(p);
        console.log(`Удалён устаревший ${side}-файл: ${p}`);
      }
    }
  }

  // --- Распаковка ---
  mkdirSync(dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, dbBuf);
  console.log(`БД восстановлена: ${zipPath} → ${dbPath} (${dbBuf.length} байт)`);

  let uploadsRestored = 0;
  for (const entry of zip.getEntries()) {
    const name = entry.entryName;
    if (!name.startsWith(UPLOAD_PREFIX) || name === UPLOAD_PREFIX) continue;
    // entryName внутри zip использует прямые слэши — join корректно соберёт путь
    const dest = resolve(process.cwd(), name);
    if (entry.isDirectory) {
      mkdirSync(dest, { recursive: true });
      continue;
    }
    const content = zip.readFile(name);
    if (!content) continue;
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
    uploadsRestored += 1;
  }
  console.log(`uploads: распаковано файлов: ${uploadsRestored} → ${resolve(process.cwd(), "public", "uploads")}`);

  // --- Сверка sha256 БД с манифестом ---
  const restoredBytes = readFileSync(dbPath);
  const restoredSha = createHash("sha256").update(restoredBytes).digest("hex");
  if (restoredSha !== manifest.db.sha256) {
    fail(`sha256 восстановленной БД (${restoredSha}) не совпадает с манифестом (${manifest.db.sha256})`);
  }
  console.log(`sha256 БД = манифесту: ${restoredSha.slice(0, 16)}… — OK`);

  // --- Сверка числа файлов uploads (мусор в каталоге — WARN, не FAIL) ---
  if (uploadsRestored !== manifest.uploads.files) {
    console.log(
      `WARN: распаковано ${uploadsRestored} файлов uploads, в манифесте ${manifest.uploads.files} (лишние файлы в каталоге restore не удаляет)`,
    );
  }

  // --- Версии схемы (решение №4) ---
  const journalPath = resolve(process.cwd(), "drizzle", "meta", "_journal.json");
  if (!existsSync(journalPath)) {
    fail(`не найден ${journalPath} — восстановление возможно только из каталога site/ репозитория`);
  }
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ idx: number }>;
  };
  const journalCount = journal.entries.length;

  const sqlite = new Database(dbPath);
  const applied = (
    sqlite
      .prepare("SELECT COUNT(*) AS c FROM __drizzle_migrations")
      .get() as { c: number }
  ).c;
  if (applied > journalCount) {
    sqlite.close();
    fail(
      `снапшот снят с более новой версии кода (в БД применено ${applied} миграций, в репозитории ${journalCount}) — обновите репозиторий (git pull) и повторите`,
    );
  }
  if (applied < journalCount) {
    console.log(`Докатываю миграции: ${journalCount - applied} шт. (в БД ${applied}, в коде ${journalCount})`);
  }
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  // --- Самопроверка ---
  const integrity = sqlite.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  if (integrity.integrity_check !== "ok") {
    sqlite.close();
    fail(`PRAGMA integrity_check != ok: ${integrity.integrity_check}`);
  }
  const fk = sqlite.prepare("PRAGMA foreign_key_check").all();
  if (fk.length > 0) {
    sqlite.close();
    fail(`PRAGMA foreign_key_check вернул нарушения: ${JSON.stringify(fk)}`);
  }
  sqlite.close();
  console.log("PRAGMA integrity_check = ok; foreign_key_check — без нарушений");

  // --- Итог ---
  console.log("");
  console.log("=== Восстановление завершено ===");
  console.log(`Артефакт: ${zipPath} (снят ${manifest.createdAt}${manifest.gitCommit ? `, git ${manifest.gitCommit.slice(0, 7)}` : ""})`);
  console.log(`Счётчики из манифеста: ${Object.entries(manifest.db.tables)
    .map(([t, n]) => `${t}=${n}`)
    .join(", ")}; миграций применено: ${manifest.db.migrationsApplied}`);
  console.log(`uploads из манифеста: ${manifest.uploads.files} файлов (${(manifest.uploads.bytes / 1024 / 1024).toFixed(1)} МБ)`);
  console.log("Предупреждения манифеста: " + manifest.warnings.join("; "));
  console.log("");
  console.log("НАПОМИНАНИЕ: .env снапшотом не восстанавливается — DATABASE_URL, ADMIN-доступы, SITE_URL и др. настраиваются отдельно (см. docs/deploy-snapshot.md)");
  console.log("Дальше: npm run snapshot:check → npm run build → npm run start");
}

main();
