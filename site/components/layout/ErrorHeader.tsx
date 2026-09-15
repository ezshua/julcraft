"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dictionary } from "@/lib/dictionaries/ru";

const ERROR_NAV = [
  { href: "/", key: "showcase" },
  { href: "/catalog", key: "catalog" },
  { href: "/configurator", key: "configurator" },
  { href: "/contacts", key: "contacts" },
  { href: "/about", key: "about" },
] as const;

type ErrorHeaderProps = {
  layout: Dictionary["layout"];
};

// Шапка и мобильное меню страницы 404 — копия mockup/error.html
export default function ErrorHeader({ layout }: ErrorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = ERROR_NAV.map((link) => ({
    href: link.href,
    label: layout.errorNav[link.key],
  }));
  return (
    <>
      <header className="topbar">
        <Link className="logo" href="/">
          JulCraft<small>{layout.workshop}</small>
        </Link>
        <nav>
          {nav.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="actions">
          <a className="icon-btn" href="/admin/login" title={layout.masterLoginTitle}>
            ⏻
          </a>
          <button
            className="burger"
            onClick={() => setMenuOpen(true)}
            aria-label={layout.menu}
          >
            ☰
          </button>
        </div>
      </header>

      <div className={menuOpen ? "mobile-menu open" : "mobile-menu"} id="mm">
        <div className="mm-head">
          <b>JulCraft</b>
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(false)}
            aria-label={layout.close}
          >
            ✕
          </button>
        </div>
        {nav.map((link) => (
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
          <a href="/admin/login" style={{ color: "var(--rust)" }}>
            {layout.masterLoginArrow}
          </a>
        </div>
      </div>
    </>
  );
}
