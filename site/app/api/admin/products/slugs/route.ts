import { db } from "@/lib/db";
import { products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";

// Все занятые slug товаров — для автогенерации уникального slug в модалке товара.
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const rows = db.select({ slug: products.slug }).from(products).all();
  return Response.json({ slugs: rows.map((r) => r.slug) });
}