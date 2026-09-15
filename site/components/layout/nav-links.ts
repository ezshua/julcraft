import type { Dictionary } from "@/lib/dictionaries/ru";

export const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/catalog", key: "catalog" },
  { href: "/configurator", key: "configurator" },
  { href: "/contacts", key: "contacts" },
  { href: "/about", key: "about" },
] as const;

export function navLabels(
  layout: Dictionary["layout"],
): { href: string; label: string }[] {
  return NAV_LINKS.map((link) => ({
    href: link.href,
    label: layout.nav[link.key],
  }));
}
