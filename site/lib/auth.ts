import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ru } from "./dictionaries/ru";
import { en } from "./dictionaries/en";
import { uk } from "./dictionaries/uk";

// Labels для полей формы входа (next-auth Credentials-провайдер).
// Определяется по DEFAULT_LOCALE из .env (D-i18n-6): на уровне модуля
// активного HTTP-запроса ещё нет, но cookie/cookie-переключение не влияет
// на форму входа — она показывается до авторизации, когда locale = дефолт.
const DEFAULT_LOCALE =
  process.env.DEFAULT_LOCALE === "en"
    ? "en"
    : process.env.DEFAULT_LOCALE === "uk"
      ? "uk"
      : "ru";
const DICTS: Record<string, { admin: { auth: { loginLabel: string; passwordLabel: string } } }> = {
  ru,
  en,
  uk,
};
const labels = DICTS[DEFAULT_LOCALE].admin.auth;

// Один аккаунт (D-12): логин/пароль из env, не из кода.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        login: { label: labels.loginLabel },
        password: { label: labels.passwordLabel, type: "password" },
      },
      authorize: async (credentials) => {
        const login = credentials?.login as string | undefined;
        const password = credentials?.password as string | undefined;
        if (
          login &&
          password &&
          login === process.env.ADMIN_LOGIN &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "1", name: login };
        }
        // Неверные кредиты → null (без подсказки, что именно неверно)
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  secret: process.env.AUTH_SECRET,
});