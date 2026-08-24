import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  componentTypes,
  components,
  slotTemplates,
} from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin";
import { BASE_COMPONENT_TYPE_CODES } from "@/lib/component-types";
import {
  componentTypeUpdateSchema,
  type ComponentTypeUpdateInput,
} from "@/lib/schemas";

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Обновление типа (код изменить нельзя — см. componentTypeUpdateSchema).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const typeId = parseId(id);
  if (!typeId) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = componentTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return Response.json({ error: message }, { status: 400 });
  }
  const data = parsed.data as ComponentTypeUpdateInput;

  const current = db
    .select()
    .from(componentTypes)
    .where(eq(componentTypes.id, typeId))
    .get();
  if (!current) {
    return Response.json({ error: "Тип не найден" }, { status: 404 });
  }

  // Деактивация разрешена даже для используемого типа: существующие записи
  // продолжают ссылаться на код (валидация принимает неактивные), но тип
  // исчезает из выпадающих списков для новых записей.
  // Патчевое обновление: undefined-поля не трогаем (drizzle пропускает их в SET);
  // полностью пустое тело отклоняем явно — иначе drizzle упадёт на пустом SET.
  if (
    data.name === undefined &&
    data.sortOrder === undefined &&
    data.isActive === undefined
  ) {
    return Response.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  db.update(componentTypes)
    .set({
      name: data.name,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    })
    .where(eq(componentTypes.id, typeId))
    .run();

  return Response.json({ ok: true });
}

// Удаление разрешено только для кастомного типа, который нигде не используется.
// Базовые типы сида защищены: на их коды ссылаются данные, сид их восстанавливает.

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const typeId = parseId(id);
  if (!typeId) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }

  const current = db
    .select()
    .from(componentTypes)
    .where(eq(componentTypes.id, typeId))
    .get();
  if (!current) {
    return Response.json({ error: "Тип не найден" }, { status: 404 });
  }

  if (BASE_COMPONENT_TYPE_CODES.has(current.code)) {
    return Response.json(
      { error: "Базовый тип нельзя удалить — можно только деактивировать" },
      { status: 409 },
    );
  }

  const usedByComponents = db
    .select({ id: components.id })
    .from(components)
    .where(eq(components.componentType, current.code))
    .all();
  const usedBySlots = db
    .select({ id: slotTemplates.id })
    .from(slotTemplates)
    .where(eq(slotTemplates.componentType, current.code))
    .all();

  if (usedByComponents.length > 0 || usedBySlots.length > 0) {
    return Response.json(
      {
        error:
          "Тип используется в комплектующих или шаблонах слотов — сначала переназначьте их",
      },
      { status: 409 },
    );
  }

  db.delete(componentTypes).where(eq(componentTypes.id, typeId)).run();
  return Response.json({ ok: true });
}
