import { requireAdmin } from "@/lib/admin";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";
import { sendTelegram } from "@/lib/telegram";

// Кнопка «Тест: отправить сообщение» в настройках.
// Принимает botToken/chatId из полей формы (не из БД) — чтобы тест работал
// до нажатия «Сохранить». Если тело пустое — берутся значения из БД.
export async function POST(request: Request) {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  let body: { botToken?: string; chatId?: string } = {};
  try {
    const parsed = (await request.json()) as { botToken?: string; chatId?: string };
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    // пустое тело — используем значения из БД
  }

  const result = await sendTelegram(t(dict, "admin.errors.telegramTestMessage" as DictionaryKey), {
    botToken: body.botToken,
    chatId: body.chatId,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ ok: true });
}
