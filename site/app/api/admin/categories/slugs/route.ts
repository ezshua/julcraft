import { db } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";

// Все занятые slug категорий — для автогенерации уникального slug в модалке создания.
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const rows = db.select({ slug: categories.slug }).from(categories).all();
  return Response.json({ slugs: rows.map((r) => r.slug) });
}
