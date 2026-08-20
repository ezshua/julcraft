"use server";

import { signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

// Выход из панели: знак «⏻» и «Выйти →» в мобильном меню.
export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/admin/login");
}