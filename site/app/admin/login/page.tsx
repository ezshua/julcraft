import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import LoginForm from "@/components/admin/LoginForm";
import { AdminDictProvider } from "@/components/admin/admin-dict-context";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    title: t(dict, "admin.login.title"),
  };
}

// Копия mockup/admin/login.html 1:1: body.login-page → div.login-page (класс — plain-селектор).
export default async function LoginPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.admin.login;

  return (
    <div className="login-page">
      <main className="login-card">
        <div className="logo-big">JulCraft</div>
        <p className="sub">{d.subtitle}</p>

        <AdminDictProvider dict={dict.admin} locale={locale}>
          <LoginForm />
        </AdminDictProvider>

        <p className="sub" style={{ marginTop: "22px" }}>
          <Link href="/" style={{ color: "var(--olive)" }}>
            {d.backHome}
          </Link>
        </p>
      </main>
    </div>
  );
}