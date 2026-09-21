import { db } from "@/lib/db";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { categories } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";

// Все занятые slug категорий — для автогенерации уникального slug в модалке создания.
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const rows = db.select({ slug: categories.slug }).from(categories).all();
  return Response.json({ slugs: rows.map((r) => r.slug) });
}
