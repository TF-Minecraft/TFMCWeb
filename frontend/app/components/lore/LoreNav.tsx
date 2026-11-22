"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LINKS = [
  { href: "/lore", label: "Overview", key: "overview" },
  { href: "/lore/characters", label: "Characters", key: "characters" },
  { href: "/lore/organisations", label: "Factions & orgs", key: "organisations" },
  { href: "/lore/storylines", label: "Storylines", key: "storylines" },
  { href: "/lore/calendar", label: "Calendar", key: "calendar" },
  { href: "/lore/map", label: "Map", key: "map" },
  { href: "/lore/team", label: "Team", key: "team" },
  { href: "/lore/deleted", label: "Deleted", key: "deleted" },
] as const;

export type LoreSection = (typeof LINKS)[number]["key"];

/** The tab a lore path sits under. Events live under the calendar. */
export function loreSection(pathname: string): LoreSection | null {
  if (pathname === "/lore" || pathname === "/lore/") return "overview";
  if (pathname.startsWith("/lore/events")) return "calendar";
  for (const link of LINKS) {
    if (link.key !== "overview" && (pathname === link.href || pathname.startsWith(`${link.href}/`))) return link.key;
  }
  return null;
}

export default function LoreNav({ calendarOnly = false }: { calendarOnly?: boolean }) {
  const current = loreSection(usePathname() ?? "");
  const links = calendarOnly ? LINKS.filter((link) => link.key === "calendar") : LINKS;
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [current]);

  return (
    <nav
      ref={navRef}
      aria-label="Lore panel"
      className="-mb-px flex max-w-full select-none gap-4 overflow-x-auto [scrollbar-width:none] sm:gap-5"
    >
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === current ? "page" : undefined}
          className={`shrink-0 border-b-2 pb-2 text-sm font-semibold outline-none transition-colors focus-visible:text-[var(--tfmc-accent)] ${
            link.key === current
              ? "border-[var(--tfmc-accent)] text-[var(--tfmc-cream)]"
              : "border-transparent text-[var(--tfmc-stone)] hover:text-[var(--tfmc-cream)]"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
