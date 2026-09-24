import "server-only";
import { cookies } from "next/headers";
import {
  isSkin,
  normalizeDefaultSkin,
  SKIN_COOKIE_KEY,
  type UserSkin,
} from "./user-settings";

export async function getServerSkin(): Promise<UserSkin> {
  try {
    const saved = (await cookies()).get(SKIN_COOKIE_KEY)?.value;
    if (isSkin(saved)) return saved;
  } catch {
    // вне HTTP-запроса (например, статическая генерация) — дефолт
  }
  return normalizeDefaultSkin(process.env.DEFAULT_SKIN);
}
