import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Один аккаунт (D-12): логин/пароль из env, не из кода.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        login: { label: "Логин" },
        password: { label: "Пароль", type: "password" },
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
        // Неверные креды → null (без подсказки, что именно неверно)
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  secret: process.env.AUTH_SECRET,
});