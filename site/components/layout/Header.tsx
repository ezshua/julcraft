"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { telHref, type SiteSettings } from "@/lib/settings";
import MobileMenu from "./MobileMenu";
import { NAV_LINKS } from "./nav-links";

export default function Header({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="topbar">
        <Link className="logo" href="/">
          JulCraft
        </Link>
        <nav>
          {NAV_LINKS.map((link) => (
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
          <a
            className="icon-btn"
            href={telHref(settings.contacts.phone)}
            title="Позвонить"
          >
            ☎
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
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        settings={settings}
      />
    </>
  );
}
