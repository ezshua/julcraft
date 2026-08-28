import { requireAdmin } from "@/lib/admin";

// Чтение TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID из .env (process.env),
// чтобы админ мог подгрузить их в форму кнопкой «Обновить из настроек».
// Рабочие значения всё равно берутся из БД (Settings.telegram.*).
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  return Response.json({
    botToken: (process.env.TELEGRAM_BOT_TOKEN ?? "").trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID ?? "").trim(),
  });
}
