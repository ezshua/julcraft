import { sql } from "drizzle-orm";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// Счётчик цен в заданной валюте (для предупреждения при удалении, D-27).
export async function GET(request: Request) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!code) return Response.json({ count: 0 });

  const pairs: [string, string][] = [
    ["products", "priceCurrency"],
    ["categories", "workPriceCurrency"],
    ["components", "priceCurrency"],
    ["components", "processingPriceCurrency"],
    ["orders", "calcPriceCurrency"],
  ];

  let count = 0;
  for (const [table, col] of pairs) {
    const n = db
      .all<{ c: number }>(
        sql.raw(`SELECT COUNT(*) AS c FROM ${table} WHERE ${col} = '${code}'`),
      )[0]?.c;
    count += n ?? 0;
  }

  return Response.json({ count });
}
