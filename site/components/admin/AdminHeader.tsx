"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/admin/(panel)/actions";
import { useAdminDict } from "./admin-dict-context";

const ADMIN_LINKS = [
  { href: "/admin", key: "navDashboard" },
  { href: "/admin/orders", key: "navOrders" },
  { href: "/admin/products", key: "navProducts" },
  { href: "/admin/components", key: "navComponents" },
  { href: "/admin/categories", key: "navCategories" },
  { href: "/admin/settings", key: "navSettings" },
] as const;

// Шапка панели мастера — копия topbar + mobile-menu из mockup/admin/*.html.
export default function AdminHeader() {
  const d = useAdminDict().header;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      <header className="topbar">
        <Link className="logo" href="/admin">
          JulCraft<small>{d.panelTitle}</small>
        </Link>
        <nav>
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "is-active" : undefined}
            >
              {d[link.key]}
            </Link>
          ))}
        </nav>
        <div className="actions">
          <form action={logoutAction}>
            <button className="icon-btn icon-btn--rust" title={d.logoutTitle}>
              ⏻
            </button>
          </form>
          <button
            className="burger"
            onClick={() => setMenuOpen(true)}
            aria-label={d.menuAria}
          >
            ☰
          </button>
        </div>
      </header>

      <div className={menuOpen ? "mobile-menu open" : "mobile-menu"} id="mm">
        <div className="mm-head">
          <b>{d.panelTitle}</b>
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(false)}
            aria-label={d.closeAria}
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
            {d[link.key]}
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
              {d.logoutMobile}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}