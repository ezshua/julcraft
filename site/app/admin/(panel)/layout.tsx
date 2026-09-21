import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminDictProvider } from "@/components/admin/admin-dict-context";

// Панель мастера не индексируется
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Защита панели: без сессии — на /admin/login (серверная проверка в layout).
// Маршруты внутри группы: /admin, /admin/products, /admin/components,
// /admin/categories, /admin/orders, /admin/settings.
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <AdminDictProvider dict={dict.admin}>
      <AdminHeader />
      <main className="admin-wrap">{children}</main>
    </AdminDictProvider>
  );
}