import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminHeader from "@/components/admin/AdminHeader";

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

  return (
    <>
      <AdminHeader />
      <main className="admin-wrap">{children}</main>
    </>
  );
}