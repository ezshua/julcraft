"use client";

import Link from "next/link";
import { type SiteSettings } from "@/lib/settings";
import type { Dictionary } from "@/lib/dictionaries/ru";
import { navLabels } from "./nav-links";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  settings: SiteSettings;
  layout: Dictionary["layout"];
};

export default function MobileMenu({
  open,
  onClose,
  settings,
  layout,
}: MobileMenuProps) {
  const links = navLabels(layout);
  return (
    <div className={open ? "mobile-menu open" : "mobile-menu"} id="mm">
      <div className="mm-head">
        <b>JulCraft</b>
        <button className="icon-btn" onClick={onClose} aria-label={layout.close}>
          ✕
        </button>
      </div>
      {links.map((link) => (
        <Link key={link.href} className="mm" href={link.href} onClick={onClose}>
          {link.label}
        </Link>
      ))}
      <div className="mm-foot">
        {settings.contacts.address} · ☎ {settings.contacts.phone}
      </div>
    </div>
  );
}
