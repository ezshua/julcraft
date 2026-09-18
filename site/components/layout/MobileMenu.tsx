"use client";

import Link from "next/link";
import { type SiteSettings } from "@/lib/settings";
import { L } from "@/lib/localize";
import type { Dictionary } from "@/lib/dictionaries/ru";
import type { Locale } from "@/lib/i18n";
import { navLabels } from "./nav-links";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  settings: SiteSettings;
  layout: Dictionary["layout"];
  locale: Locale;
};

export default function MobileMenu({
  open,
  onClose,
  settings,
  layout,
  locale,
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
        {L(settings.contacts.address, locale)} · ☎ {settings.contacts.phone}
      </div>
    </div>
  );
}
