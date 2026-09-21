"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import type { DictionaryKey } from "@/lib/i18n";

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
      const dict = getDictionary(await getLocale());
      return { error: t(dict, "admin.login.errorInvalidCreds" as DictionaryKey) };
    }
    throw error;
  }
  redirect("/admin");
}