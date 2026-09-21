import { db } from "@/lib/db";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";

// Все занятые slug товаров — для автогенерации уникального slug в модалке товара.
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  const rows = db.select({ slug: products.slug }).from(products).all();
  return Response.json({ slugs: rows.map((r) => r.slug) });
}