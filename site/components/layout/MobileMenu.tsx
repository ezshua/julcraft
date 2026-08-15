"use client";

import Link from "next/link";
import { type SiteSettings } from "@/lib/settings";
import { NAV_LINKS } from "./nav-links";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  settings: SiteSettings;
};

export default function MobileMenu({ open, onClose, settings }: MobileMenuProps) {
  return (
    <div className={open ? "mobile-menu open" : "mobile-menu"} id="mm">
      <div className="mm-head">
        <b>JulCraft</b>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      {NAV_LINKS.map((link) => (
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
