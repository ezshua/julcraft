import { db } from "@/lib/db";
import { categories, orders, products } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";

const PAGE_SIZE = 10;

// Список заявок с фильтрами/пагинацией и join товара/категории для подписей.
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const url = new URL(request.url);
  const st = url.searchParams.get("st") ?? "all";
  const ty = url.searchParams.get("ty") ?? "all";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const allOrders = db.select().from(orders).all();
  const allProducts = db.select().from(products).all();
  const allCategories = db.select().from(categories).all();

  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  const match = (o: (typeof allOrders)[number]) => {
    if (st !== "all" && o.status !== st) return false;
    if (ty !== "all" && o.type !== ty) return false;
    return true;
  };

  const found = allOrders.filter(match).sort((a, b) => b.id - a.id);
  const total = found.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = found.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return Response.json({
    orders: pageItems.map((o) => {
      const product = o.productId != null ? productById.get(o.productId) : undefined;
      return {
        id: o.id,
        type: o.type,
        customerName: o.customerName,
        contact: o.contact,
        message: o.message,
        productId: o.productId,
        productName: product?.name ?? null,
        categoryName: product ? categoryById.get(product.categoryId)?.name ?? null : null,
        configJson: o.configJson,
        collagePath: o.collagePath,
        calcPrice: o.calcPrice,
        calcDays: o.calcDays,
        status: o.status,
        createdAt: o.createdAt,
      };
    }),
    page: currentPage,
    pages,
    total,
  });
}