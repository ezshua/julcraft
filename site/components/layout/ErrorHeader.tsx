"use client";

import Link from "next/link";
import { useState } from "react";

const ERROR_NAV = [
  { href: "/", label: "Витрина" },
  { href: "/catalog", label: "Каталог" },
  { href: "/configurator", label: "Конфигуратор" },
  { href: "/about", label: "О нас" },
  { href: "/contacts", label: "Контакты" },
];

// Шапка и мобильное меню страницы 404 — копия mockup/error.html
export default function ErrorHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <header className="topbar">
        <Link className="logo" href="/">
          JulCraft<small>мастерская украшений</small>
        </Link>
        <nav>
          {ERROR_NAV.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="actions">
          <a className="icon-btn" href="/admin/login" title="Вход мастера">
            ⏻
          </a>
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
          <b>JulCraft</b>
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        {ERROR_NAV.map((link) => (
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
            Вход мастера →
          </a>
        </div>
      </div>
    </>
  );
}
