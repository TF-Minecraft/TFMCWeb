import Link from "next/link";
import type { ReactNode } from "react";

import { cx, WikiPage, wikiCard, wikiDisplayFont } from "@/app/components/wiki";
import { factionGuidePages } from "@/app/wiki/data";

/** Date of the last revision of the Factions guide pages. */
export const FACTIONS_GUIDE_UPDATED = "2026-10-20";

/** Inline command, in the wiki's accent colour. */
export function Cmd({ children }: { children: ReactNode }) {
  return <code className="text-[var(--tfmc-accent)]">{children}</code>;
}

/** Bulleted list in body text. */
export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">{children}</ul>;
}

/** Numbered list in body text. */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">{children}</ol>;
}

/** A paragraph of body text. */
export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-[var(--tfmc-mist)]">{children}</p>;
}

/** Cards linking every page of the guide. */
export function FactionsGuideCards({ exclude }: { exclude?: string }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {factionGuidePages
        .filter((page) => page.href !== exclude)
        .map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={cx(wikiCard, "block transition-colors hover:border-[var(--tfmc-accent)]")}
          >
            <span className={cx(wikiDisplayFont, "block text-lg text-[var(--tfmc-cream)]")}>{page.label}</span>
            <span className="mt-1 block text-sm text-[var(--tfmc-mist)]">{page.blurb}</span>
          </Link>
        ))}
    </div>
  );
}

/** Frame for a subpage of the Factions guide: back link, title, and links to the rest of the guide. */
export function FactionsGuidePage({ href, intro, children }: { href: string; intro: ReactNode; children: ReactNode }) {
  const page = factionGuidePages.find((p) => p.href === href);
  if (!page) throw new Error(`${href} is not a page of the Factions guide`);
  const index = factionGuidePages.indexOf(page);
  const next = factionGuidePages[index + 1];

  return (
    <WikiPage
      lastModified={FACTIONS_GUIDE_UPDATED}
      title={page.label}
      intro={intro}
      width="lg"
      beforeTitle={
        <Link href="/wiki/factions" className="text-xs text-[var(--tfmc-mist)] hover:text-[var(--tfmc-cream)]">
          &larr; Factions guide
        </Link>
      }
    >
      {children}
      {next ? (
        <p className="mt-10 text-sm text-[var(--tfmc-mist)]">
          Next:{" "}
          <Link href={next.href} className="text-[var(--tfmc-accent)] underline underline-offset-2">
            {next.label}
          </Link>
        </p>
      ) : null}
      <nav aria-label="Factions guide" className="mt-6">
        <h2 className={cx(wikiDisplayFont, "text-xl text-[var(--tfmc-cream)]")}>More of the Factions guide</h2>
        <FactionsGuideCards exclude={href} />
      </nav>
    </WikiPage>
  );
}
