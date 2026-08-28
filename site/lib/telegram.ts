import { getSettings } from "./get-settings";

// Отправка сообщения мастеру в Telegram (Этап 4.6).
// Токены берутся из Settings (форма «Настройки»); при пустых — только лог.
// override позволяет передать токен/чат из полей формы (тест до сохранения в БД).
export async function sendTelegram(
  text: string,
  override?: { botToken?: string; chatId?: string },
): Promise<{ ok: boolean; error?: string }> {
  const { telegram } = getSettings();

  const botToken = (override?.botToken ?? telegram.botToken).trim();
  const chatId = (override?.chatId ?? telegram.chatId).trim();
  if (!botToken || !chatId) {
    console.log(`[telegram не настроен] ${text}`);
    return {
      ok: false,
      error: "Telegram не настроен: укажите botToken и chatId в настройках",
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка сети",
    };
  }
}