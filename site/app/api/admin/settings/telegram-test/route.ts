import { requireAdmin } from "@/lib/admin";
import { sendTelegram } from "@/lib/telegram";

// Кнопка «Тест: отправить сообщение» в настройках.
export async function POST() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const result = await sendTelegram("Тест от панели мастера — JulCraft");
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ ok: true });
}