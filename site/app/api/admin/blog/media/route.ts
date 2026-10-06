import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { requireAdmin } from "@/lib/admin";

// Файлы, загруженные для записей блога (kind="blog", каталог uploads/blog).
// Редактор показывает их списком, чтобы вставить в текст готовый путь.
// Отдаём только имя и публичный путь — никаких абсолютных путей и статистики.
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const dir = resolve(process.cwd(), "public", "uploads", "blog");
  if (!existsSync(dir)) {
    return Response.json({ files: [] });
  }

  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && statSync(resolve(dir, entry.name)).size > 0)
    .map((entry) => ({ name: entry.name, path: `/uploads/blog/${entry.name}` }))
    // Свежие файлы сверху: имя начинается с метки времени загрузки.
    .sort((a, b) => b.name.localeCompare(a.name));

  return Response.json({ files });
}
