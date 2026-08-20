import { getSettings } from "./get-settings";

// Отправка сообщения мастеру в Telegram (Этап 4.6).
// Токены берутся из Settings (форма «Настройки»); при пустых — только лог.
export async function sendTelegram(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const { telegram } = getSettings();

  if (!telegram.botToken || !telegram.chatId) {
    console.log(`[telegram не настроен] ${text}`);
    return {
      ok: false,
      error: "Telegram не настроен: укажите botToken и chatId в настройках",
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${telegram.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegram.chatId, text }),
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