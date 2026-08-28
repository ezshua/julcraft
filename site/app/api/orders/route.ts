import { z } from "zod";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { db } from "@/lib/db";
import {
  orders,
  products,
  categories,
  components as componentsTable,
} from "@/drizzle/schema";
import type { CalcComponent } from "@/lib/calc";
import { calcTotals, buildSnapshot, MAX_COLLAGE_BYTES } from "@/lib/calc";
import { sendTelegram, sendTelegramPhoto } from "@/lib/telegram";
import { getSettings } from "@/lib/get-settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { formatPrice, asPriced } from "@/lib/format";

const orderSchema = z.object({
  type: z.literal("product"),
  productId: z.number().int().positive(),
  customerName: z.string().trim().min(1, "Укажите имя"),
  contact: z.string().trim().min(1, "Укажите контакт"),
  message: z.string().trim().default(""),
});

// Клиент передаёт только id+qty; цены/сроки сервер берёт из БД (D-4).
const customSelectionSchema = z.object({
  componentId: z.number().int().positive(),
  qty: z.number().int().min(0).max(99),
});

const customSchema = z.object({
  type: z.literal("custom"),
  categoryId: z.number().int().positive(),
  customerName: z.string().trim().min(1, "Укажите имя"),
  contact: z.string().trim().min(1, "Укажите контакт"),
  message: z.string().trim().default(""),
  collageDataUrl: z
    .string()
    .regex(/^data:image\/png;base64,/, "Коллаж должен быть PNG data URL")
    .max(MAX_COLLAGE_BYTES * 2)
    .nullable(),
  config: z.object({
    items: z.array(customSelectionSchema),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const rawType =
    typeof body === "object" && body !== null && "type" in body
      ? (body as { type: unknown }).type
      : undefined;

  if (rawType === "custom") return handleCustom(body);
  return handleProduct(body);
}

// Заявка на готовое изделие: серверный расчёт цены/срока, запись Order.
async function handleProduct(body: unknown): Promise<Response> {
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }

  const { productId, customerName, contact, message } = parsed.data;

  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return Response.json({ error: "Товар не найден" }, { status: 400 });
  }

  const now = new Date();
  const res = db
    .insert(orders)
    .values({
      type: "product",
      customerName,
      contact,
      message,
      productId: product.id,
      configJson: JSON.stringify({ productId: product.id }),
      collagePath: null,
      calcPrice: product.price,
      calcPriceCurrency: product.priceCurrency,
      calcDays: 0,
      status: "new",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const id = Number(res.lastInsertRowid);

  // Уведомление мастеру в Telegram; без токенов — лог (поведение не меняется).
  // Сумма — в валюте отображения мастера (Q-5, plan-finances2.md).
  const { finance } = getSettings();
  const currency = await getDisplayCurrency();
  const notice = `[заявка ${id}] товар: ${product.name}; клиент: ${customerName} (${contact}); ` +
    `цена: ${formatPrice(asPriced(product.price, product.priceCurrency), currency, finance)}; сообщение: ${message || "—"}`;

  // Обложку товара шлём картинкой, если файл доступен локально.
  let sent = { ok: false as boolean };
  const cover = product.images[0];
  if (cover && cover.startsWith("/")) {
    try {
      const buf = await readFile(resolve(process.cwd(), "public", cover.replace(/^\//, "")));
      sent = await sendTelegramPhoto(
        notice,
        buf,
        cover.split("/").pop() ?? "cover.jpg",
        cover.endsWith(".png") ? "image/png" : "image/jpeg",
      );
    } catch {
      sent = { ok: false };
    }
  }
  if (!sent.ok) {
    const t = await sendTelegram(notice);
    if (!t.ok) console.log(notice);
  }

  return Response.json({ id });
}

// Заявка на собранное в конфигураторе украшение (Этап 5):
// пересчёт из БД по componentId+qty, snapshot в configJson, PNG-коллаж на диск.
async function handleCustom(rawBody: unknown): Promise<Response> {
  const parsed = customSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }
  const { categoryId, customerName, contact, message, collageDataUrl } = parsed.data;
  const selections = parsed.data.config.items.filter((s) => s.qty > 0);
  if (selections.length === 0) {
    return Response.json({ error: "Выберите хотя бы один компонент" }, { status: 400 });
  }

  const category = db.select().from(categories).where(eq(categories.id, categoryId)).get();
  if (!category) {
    return Response.json({ error: "Категория не найдена" }, { status: 400 });
  }

  const compsById = new Map<number, CalcComponent>(
    db.select().from(componentsTable).all().map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        componentType: c.componentType,
        priceMinor: c.price,
        priceCurrency: c.priceCurrency,
        processingPriceMinor: c.processingPrice,
        processingPriceCurrency: c.processingPriceCurrency,
        processingDays: c.processingDays,
        stockQty: c.stockQty,
        isOrderable: c.isOrderable,
        deliveryDays: c.deliveryDays,
      },
    ]),
  );
  for (const sel of selections) {
    if (!compsById.has(sel.componentId)) {
      return Response.json({ error: "Компонент не найден" }, { status: 400 });
    }
  }

  const { finance } = getSettings();
  const currency = await getDisplayCurrency();

  const calcCategory = {
    name: category.name,
    workPriceMinor: category.workPrice,
    workPriceCurrency: category.workPriceCurrency,
    baseWorkDays: category.baseWorkDays,
  };
  const { total, days } = calcTotals(calcCategory, selections, compsById, currency, finance);

  // Snapshot — canonical (buildSnapshot), total/days — серверные.
  const snapshot = buildSnapshot(category.id, calcCategory, selections, compsById, currency, finance);

  let collagePath: string | null = null;
  if (collageDataUrl) {
    const base64 = collageDataUrl.slice(collageDataUrl.indexOf(",") + 1);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length > MAX_COLLAGE_BYTES) {
      return Response.json({ error: "Коллаж слишком большой" }, { status: 413 });
    }
    const dir = resolve(process.cwd(), "public", "uploads", "collages");
    await mkdir(dir, { recursive: true });
    const file = `collage-${Date.now()}-${randomBytes(4).toString("hex")}.png`;
    await writeFile(resolve(dir, file), bytes);
    collagePath = `/uploads/collages/${file}`;
  }

  const now = new Date();
  const res = db
    .insert(orders)
    .values({
      type: "custom",
      customerName,
      contact,
      message,
      productId: null,
      configJson: JSON.stringify(snapshot),
      collagePath,
      calcPrice: total.priceMinor,
      calcPriceCurrency: total.priceCurrency,
      calcDays: days,
      status: "new",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const id = Number(res.lastInsertRowid);

  const notice =
    `[заявка ${id}] конфигуратор: ${category.name}; клиент: ${customerName} (${contact}); ` +
    `${snapshot.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(" + ")}; ` +
    `цена: ${formatPrice(total, currency, finance)}; срок: ${days} дн; сообщение: ${message || "—"}`;

  // Коллаж шлём картинкой, если он сохранён локально.
  let sent = { ok: false as boolean };
  if (collagePath && collagePath.startsWith("/")) {
    try {
      const buf = await readFile(resolve(process.cwd(), "public", collagePath.replace(/^\//, "")));
      sent = await sendTelegramPhoto(
        notice,
        buf,
        collagePath.split("/").pop() ?? "collage.png",
        "image/png",
      );
    } catch {
      sent = { ok: false };
    }
  }
  if (!sent.ok) {
    const t = await sendTelegram(notice);
    if (!t.ok) console.log(notice);
  }

  return Response.json({ id });
}
