"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { telHref, type SiteSettings } from "@/lib/settings";
import type { Dictionary } from "@/lib/dictionaries/ru";
import MobileMenu from "./MobileMenu";
import { navLabels } from "./nav-links";

type HeaderProps = {
  settings: SiteSettings;
  layout: Dictionary["layout"];
};

export default function Header({ settings, layout }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = navLabels(layout);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="topbar">
        <Link className="logo" href="/">
          JulCraft
        </Link>
        <nav>
          {links.map((link) => (
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
            title={layout.call}
          >
            ☎
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
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        settings={settings}
        layout={layout}
      />
    </>
  );
}
