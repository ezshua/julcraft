import { requireAdmin } from "@/lib/admin";
import { getDictionary, getLocale, t, type DictionaryKey } from "@/lib/i18n";

// Чтение TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID из .env (process.env),
// чтобы админ мог подгрузить их в форму кнопкой «Обновить из настроек».
// Рабочие значения всё равно берутся из БД (Settings.telegram.*).
export async function GET() {
  const dict = getDictionary(await getLocale());
  if (!(await requireAdmin())) {
    return Response.json({ error: t(dict, "admin.errors.unauthorized" as DictionaryKey) }, { status: 401 });
  }

  return Response.json({
    botToken: (process.env.TELEGRAM_BOT_TOKEN ?? "").trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID ?? "").trim(),
  });
}
