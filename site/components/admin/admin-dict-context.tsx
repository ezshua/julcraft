"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/dictionaries/ru";

type AdminDict = Dictionary["admin"];

const AdminDictContext = createContext<AdminDict | null>(null);

export function AdminDictProvider({
  dict,
  children,
}: {
  dict: AdminDict;
  children: ReactNode;
}) {
  return (
    <AdminDictContext.Provider value={dict}>{children}</AdminDictContext.Provider>
  );
}

export function useAdminDict(): AdminDict {
  const dict = useContext(AdminDictContext);
  if (!dict) {
    throw new Error("useAdminDict() must be used inside <AdminDictProvider>");
  }
  return dict;
}