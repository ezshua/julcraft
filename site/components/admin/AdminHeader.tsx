"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/admin/(panel)/actions";

const ADMIN_LINKS = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/products", label: "Товары" },
  { href: "/admin/components", label: "Склад" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/orders", label: "Заявки" },
  { href: "/admin/settings", label: "Настройки" },
];

// Шапка панели мастера — копия topbar + mobile-menu из mockup/admin/*.html.
export default function AdminHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      <header className="topbar">
        <Link className="logo" href="/admin">
          JulCraft<small>панель мастера</small>
        </Link>
        <nav>
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "is-active" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="actions">
          <form action={logoutAction}>
            <button className="icon-btn icon-btn--rust" title="Выйти">
              ⏻
            </button>
          </form>
          <button
            className="burger"
            onClick={() => setMenuOpen(true)}
            aria-label="Меню"
          >
            ☰
          </button>
        </div>
      </header>

      <div className={menuOpen ? "mobile-menu open" : "mobile-menu"} id="mm">
        <div className="mm-head">
          <b>Панель мастера</b>
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            className="mm"
            href={link.href}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <div className="mm-foot">
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "var(--rust)",
                fontWeight: 700,
              }}
            >
              Выйти →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}