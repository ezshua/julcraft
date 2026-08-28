import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/admin";

const LIMITS: Record<string, { mime: string[]; max: number; ext: string }> = {
  products: {
    mime: ["image/jpeg", "image/png", "image/webp"],
    max: 5 * 1024 * 1024,
    ext: "jpg",
  },
  components: { mime: ["image/png"], max: 2 * 1024 * 1024, ext: "png" },
  categories: {
    mime: ["image/svg+xml", "image/png", "image/webp"],
    max: 2 * 1024 * 1024,
    ext: "auto",
  },
};

const EXT_BY_MIME: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

// Загрузка изображений (товары/комплектующие). Лимиты — из макетов.
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Ожидался FormData" }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "");
  const rule = LIMITS[kind];
  if (!rule) {
    return Response.json({ error: "Некорректный kind" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Файл не передан" }, { status: 400 });
  }

  if (!rule.mime.includes(file.type)) {
    return Response.json({ error: "Неверный формат файла" }, { status: 400 });
  }
  if (file.size > rule.max) {
    return Response.json({ error: "Файл слишком большой" }, { status: 400 });
  }

  const ext =
    rule.ext === "auto" ? EXT_BY_MIME[file.type] ?? "bin" : rule.ext;
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return Response.json({ path: `/uploads/${kind}/${name}` });
}