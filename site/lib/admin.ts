import { auth } from "./auth";

// Защита API-маршрутов админки: нет сессии → 401 (вызывать в каждом route handler).
export async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  return !!session;
}