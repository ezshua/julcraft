import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { execSync } from "node:child_process";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import "dotenv/config";
import { getDbPath } from "../lib/db-path";

// ============================================================
// snapshot:capture (plan-snapshot.md Шаг 1)
// Снимает согласованный слепок боевого состояния:
//   - БД: безопасная согласованная копия через sqlite.backup()
//     (побайтовое копирование файла при активном WAL опасно);
//   - каталог public/uploads/ целиком;
//   - manifest.json со счётчиками, sha256 и предупреждениями.
// Артефакт julcraft-snapshot-YYYY-MM-DD-HHmm.zip создаётся в cwd
// (= site/), в git не попадает (site/*.zip в корневом .gitignore).
// ВНИМАНИЕ: содержит личные данные клиентов и telegram.botToken —
// не публиковать (решение №6).
// ============================================================

const SNAPSHOT_FORMAT_VERSION = 1;
const TABLES = [
  "categories",
  "componentTypes",
  "slotTemplates",
  "components",
  "products",
  "orders",
  "settings",
] as const;
const UPLOAD_FOLDERS = ["products", "components", "categories", "collages"] as const;

function fail(message: string): never {
  console.error(`ОШИБКА: ${message}`);
  process.exit(1);
}

function gitHead(): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: process.cwd(), encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}

async function main(): Promise<void> {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    fail(`файл БД не найден (${dbPath}) — снимать нечего`);
  }

  const tmpBackup = join(process.cwd(), `tmp-snapshot-backup-${Date.now()}.db`);
  const sqlite = new Database(dbPath, { readonly: true });
  try {
    // 1. Согласованная копия БД через better-sqlite3 backup()
    //    (асинхронный API — await обязателен).
    await sqlite.backup(tmpBackup);
    const applied = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM __drizzle_migrations")
        .get() as { c: number }
    ).c;
    const tables: Record<string, number> = {};
    for (const t of TABLES) {
      tables[t] = (sqlite.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c;
    }
    sqlite.close();

    const dbBytes = readFileSync(tmpBackup);
    const dbSha256 = createHash("sha256").update(dbBytes).digest("hex");

    // 2. Каталог uploads.
    const uploadsRoot = resolve(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsRoot)) {
      fail(`каталог uploads не найден (${uploadsRoot})`);
    }
    const uploadsFiles: Array<{ rel: string; bytes: number }> = [];
    const byFolder: Record<string, { files: number; bytes: number }> = {};
    for (const f of UPLOAD_FOLDERS) byFolder[f] = { files: 0, bytes: 0 };
    let uploadsBytes = 0;
    for (const abs of walkFiles(uploadsRoot)) {
      const rel = relative(process.cwd(), abs).split("\\").join("/");
      const size = statSync(abs).size;
      uploadsFiles.push({ rel, bytes: size });
      uploadsBytes += size;
      for (const f of UPLOAD_FOLDERS) {
        if (rel.startsWith(`public/uploads/${f}/`)) {
          byFolder[f].files += 1;
          byFolder[f].bytes += size;
        }
      }
    }

    // 3. Манифест.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const manifest = {
      formatVersion: SNAPSHOT_FORMAT_VERSION,
      createdAt: now.toISOString(),
      gitCommit: gitHead(),
      db: {
        sha256: dbSha256,
        bytes: dbBytes.length,
        tables,
        migrationsApplied: applied,
      },
      uploads: {
        files: uploadsFiles.length,
        bytes: uploadsBytes,
        byFolder,
      },
      warnings: [
        "содержит личные данные клиентов (заявки)",
        "содержит секреты (telegram.botToken) — не публиковать",
      ],
    };

    // 4. Zip: manifest.json + julcraft.db + public/uploads/**.
    const zip = new AdmZip();
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
    zip.addFile("julcraft.db", dbBytes);
    for (const { rel } of uploadsFiles) {
      zip.addLocalFile(resolve(process.cwd(), rel), rel.substring(0, rel.lastIndexOf("/")));
    }

    const outName = `julcraft-snapshot-${stamp}.zip`;
    zip.writeZip(resolve(process.cwd(), outName));

    console.log(`Снапшот снят: ${outName}`);
    console.log(
      `  БД: ${dbBytes.length} байт, sha256 ${dbSha256.slice(0, 16)}…, миграций применено: ${applied}`,
    );
    console.log(`  таблицы: ${TABLES.map((t) => `${t}=${tables[t]}`).join(", ")}`);
    console.log(
      `  uploads: ${uploadsFiles.length} файлов, ${(uploadsBytes / 1024 / 1024).toFixed(1)} МБ (${UPLOAD_FOLDERS.map((f) => `${f}=${byFolder[f].files}`).join(", ")})`,
    );
    console.log("  ВНИМАНИЕ: артефакт содержит личные данные и секреты — не публиковать.");
  } finally {
    if (existsSync(tmpBackup)) unlinkSync(tmpBackup);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
