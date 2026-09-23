"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/dictionaries/ru";
import type { Locale } from "@/lib/i18n";

type AdminDict = Dictionary["admin"];

const AdminDictContext = createContext<AdminDict | null>(null);

// Отдельный контекст для локали: LocalizedField читает её, чтобы устанавливать
// начальную вкладку RU/EN/UK в соответствии с языком админки (иначе вкладка
// всегда открывалась на RU, даже если мастер переключил админку на EN/UK).
const AdminLocaleContext = createContext<Locale | null>(null);

export function AdminDictProvider({
  dict,
  locale,
  children,
}: {
  dict: AdminDict;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <AdminLocaleContext.Provider value={locale}>
      <AdminDictContext.Provider value={dict}>{children}</AdminDictContext.Provider>
    </AdminLocaleContext.Provider>
  );
}

export function useAdminDict(): AdminDict {
  const dict = useContext(AdminDictContext);
  if (!dict) {
    throw new Error("useAdminDict() must be used inside <AdminDictProvider>");
  }
  return dict;
}

export function useAdminLocale(): Locale | null {
  return useContext(AdminLocaleContext);
}