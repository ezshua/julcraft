import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ============================================================
// fetch-fonts (Этап 7, T-7.0, решение D-16)
// Одноразовый скрипт: скачивает Google Fonts (официальный CSS2 API)
// и складывает woff2-субсеты в public/fonts/, генерирует public/fonts/fonts.css.
// Результат (шрифты + fonts.css) лежит в git; сам скрипт остаётся как история.
//
// Запуск:  npm run fetch-fonts   (из site/)
// Скрипт идемпотентен: перезаписывает файлы заново.
//
// Механика: CSS2 API для Chrome-UA отдаёт VARIABLE-файлы для Unbounded/
// Nunito (один URL на все веса) и статические per-weight для IBM Plex Mono.
// Дедупликация по URL: каждый уникальный woff2 скачивается один раз —
// имя файла без веса (variable) или с весом (статические). Браузер грузит
// ровно те же файлы, что грузил бы с fonts.googleapis.com.
//
// Кириллица обязательна (сайт ru): Unbounded, Nunito, IBM Plex Mono;
// Shrikhand кириллицу не поддерживает — только latin/latin-ext.
// ============================================================

const OUT_DIR = resolve(process.cwd(), "public", "fonts");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

interface FamilySpec {
  /** Имя семейства как в CSS API (family=...) */
  family: string;
  /** Веса из @import-строк скинов (это и только это скачиваем) */
  weights: number[];
  /** Субсеты, которые оставляем (latin обязателен всегда) */
  subsets: string[];
  /** Нормализованное имя для имён файлов */
  fileBase: string;
}

const FAMILIES: FamilySpec[] = [
  {
    family: "Unbounded",
    weights: [400, 600, 700, 800],
    subsets: ["latin", "cyrillic", "cyrillic-ext"],
    fileBase: "unbounded",
  },
  {
    family: "Nunito",
    weights: [400, 600, 700, 800],
    subsets: ["latin", "cyrillic", "cyrillic-ext"],
    fileBase: "nunito",
  },
  {
    family: "Shrikhand",
    weights: [400],
    subsets: ["latin", "latin-ext"],
    fileBase: "shrikhand",
  },
  {
    family: "IBM Plex Mono",
    weights: [400, 500, 600],
    subsets: ["latin", "cyrillic"],
    fileBase: "ibm-plex-mono",
  },
];

/** Комментарий-субсет, который Google ставит ПЕРЕД @font-face-блоком: /* cyrillic *​/ */
const SUBSET_RE = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;

function parseCss(css: string): Array<{ subset: string; body: string }> {
  const out: Array<{ subset: string; body: string }> = [];
  for (const m of css.matchAll(SUBSET_RE)) {
    out.push({ subset: m[1], body: m[2] });
  }
  return out;
}

function field(body: string, name: string): string | null {
  const m = body.match(new RegExp(`${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  return res.text();
}

async function fetchBin(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const missingReport: string[] = [];
  const fontFaceBlocks: string[] = [];
  /** url → локальное имя файла (дедуп: один URL — один файл) */
  const urlToFile = new Map<string, string>();
  let downloaded = 0;

  for (const spec of FAMILIES) {
    const apiUrl =
      `https://fonts.googleapis.com/css2` +
      `?family=${encodeURIComponent(spec.family)}:wght@${spec.weights.join(";")}` +
      `&display=swap`;
    console.log(`CSS API: ${spec.family} (${spec.weights.join(",")})`);
    const css = await fetchText(apiUrl);
    const faces = parseCss(css);

    for (const face of faces) {
      if (!spec.subsets.includes(face.subset)) continue;
      const src = field(face.body, "src");
      if (!src) throw new Error(`${spec.family}/${face.subset}: нет src в @font-face`);
      const urlMatch = src.match(/url\((https:\/\/[^)]+)\)/);
      if (!urlMatch) throw new Error(`${spec.family}/${face.subset}: не найден https-URL в src`);
      const url = urlMatch[1];

      const weight = field(face.body, "font-weight") ?? "400";
      const style = field(face.body, "font-style") ?? "normal";
      const unicodeRange = field(face.body, "unicode-range");
      if (!unicodeRange) {
        throw new Error(`${spec.family}/${face.subset}: нет unicode-range — фиксируем как есть`);
      }

      // Дедуп: одинаковый URL для разных весов = variable-файл → одно имя без веса.
      // Разные URL = статические файлы → вес в имени.
      let fileName: string;
      if (urlToFile.has(url)) {
        fileName = urlToFile.get(url)!;
      } else {
        const isSharedAcrossWeights =
          faces.filter((f) => f.subset === face.subset).length > 0 &&
          faces.some(
            (f) =>
              f.subset === face.subset &&
              f !== face &&
              field(f.body, "src")?.includes(url),
          );
        fileName = isSharedAcrossWeights
          ? `${spec.fileBase}-${face.subset}.woff2`
          : `${spec.fileBase}-${weight}-${face.subset}.woff2`;
        const buf = await fetchBin(url);
        writeFileSync(resolve(OUT_DIR, fileName), buf);
        urlToFile.set(url, fileName);
        downloaded += 1;
        console.log(
          `  ${face.subset.padEnd(13)} w${weight} → ${fileName} (${(buf.length / 1024).toFixed(1)} КБ)`,
        );
      }

      fontFaceBlocks.push(
        [
          `/* ${spec.family} — ${face.subset} */`,
          `@font-face {`,
          `  font-family: '${spec.family}';`,
          `  font-style: ${style};`,
          `  font-weight: ${weight};`,
          `  font-display: swap;`,
          `  src: url('/fonts/${fileName}') format('woff2');`,
          `  unicode-range: ${unicodeRange};`,
          `}`,
        ].join("\n"),
      );
    }

    for (const sub of spec.subsets) {
      const have = faces.some((f) => f.subset === sub);
      if (!have) missingReport.push(`${spec.family}: субсет ${sub} отсутствует в CSS API`);
    }
  }

  const header = [
    "/* ============================================================",
    "   JulCraft — локальные Google Fonts (self-host, D-16, T-7.0).",
    "   Сгенерировано scripts/fetch-fonts.ts из официального CSS2 API",
    "   (UA: Chrome, woff2, unicode-range-субсеты сохранены).",
    "   Семейства/веса — ровно из @import-строк скинов:",
    "     Unbounded 400/600/700/800, Nunito 400/600/700/800,",
    "     Shrikhand 400, IBM Plex Mono 400/500/600.",
    "   Unbounded/Nunito — variable-файлы (один на все веса, как",
    "   отдаёт Google); IBM Plex Mono — статические per-weight.",
    "   Кириллица: Unbounded/Nunito/IBM Plex Mono — cyrillic(+ext);",
    "   Shrikhand кириллицу не поддерживает (latin/latin-ext).",
    "   Подключается скинами: @import url('/fonts/fonts.css');",
    "   ============================================================ */",
    "",
  ].join("\n");

  writeFileSync(resolve(OUT_DIR, "fonts.css"), header + fontFaceBlocks.join("\n\n") + "\n");
  console.log(
    `\nfonts.css: ${fontFaceBlocks.length} @font-face-блоков, ${downloaded} уникальных файлов → public/fonts/`,
  );

  if (missingReport.length > 0) {
    console.log("\nОтчёт по отсутствующим субсетам:");
    for (const m of missingReport) console.log(`  - ${m}`);
  }
  console.log("\nГотово. Проверьте git status и закоммитьте public/fonts/ (не в gitignore).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
