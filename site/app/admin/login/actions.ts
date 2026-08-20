"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export type LoginState = { error: string } | undefined;

// Вход мастера (D-12): signIn("credentials", redirect:false);
// при неудаче AuthError → возвращаем ошибку для err-box, при успехе — /admin.
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const login = String(formData.get("login") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { login, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный логин или пароль — попробуйте ещё раз" };
    }
    throw error;
  }
  redirect("/admin");
}