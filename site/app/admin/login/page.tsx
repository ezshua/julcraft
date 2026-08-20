import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Вход — JulCraft Админ",
};

// Копия mockup/admin/login.html 1:1: body.login-page → div.login-page (класс — plain-селектор).
export default function LoginPage() {
  return (
    <div className="login-page">
      <main className="login-card">
        <div className="logo-big">JulCraft</div>
        <p className="sub">{"// панель мастера · только для своих"}</p>

        <LoginForm />

        <p className="sub" style={{ marginTop: "22px" }}>
          <Link href="/" style={{ color: "var(--olive)" }}>
            ← Вернуться на витрину
          </Link>
        </p>
      </main>
    </div>
  );
}