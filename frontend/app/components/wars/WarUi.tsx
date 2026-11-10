"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import MapAuthImage from "@/app/components/map/MapAuthImage";
import { mapBannerFrameClass } from "@/app/components/map/ui";
import { chroniclePanelClass } from "@/app/components/chronicle/ChroniclePanels";
import FormattedMcRuns from "@/app/components/shared/FormattedMcRuns";
import { parseNameRuns } from "@/lib/characters/lorePreview";
import { bannerPath, formatCount, legibleRgb, SIDE_LABEL } from "@/lib/wars/format";
import type { FactionRef, SidePair, WarSide } from "@/lib/wars/types";

export const pageClass = "mx-auto min-h-[calc(100dvh-var(--tfmc-header-h))] w-full max-w-6xl px-4 py-10 sm:px-6";

export const cardClass = `${chroniclePanelClass} p-4 sm:p-6`;

export const eyebrowClass = "text-xs font-medium uppercase tracking-widest text-[var(--tfmc-mist)]";

export const mutedClass = "text-[var(--tfmc-stone)]";

export const linkClass =
  "text-[var(--tfmc-cream)] underline decoration-[color-mix(in_srgb,var(--tfmc-cream)_35%,transparent)] underline-offset-4 transition-colors hover:decoration-[var(--tfmc-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)]";

export const chipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--tfmc-cream)_18%,transparent)] px-2.5 py-0.5 text-xs text-[var(--tfmc-stone)]";

/** Side colours as CSS variables, so every mark below reads them the same way. */
export function sideStyle(colors: SidePair<string>): CSSProperties {
  return { "--war-attacker": colors.attacker, "--war-defender": colors.defender } as CSSProperties;
}

export function sideVar(side: WarSide): string {
  return `var(--war-${side})`;
}

export function Section({
  id,
  eyebrow,
  title,
  children,
  className = "",
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={`${cardClass} ${className}`}>
      {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
      <h2 id={`${id}-title`} className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--tfmc-cream)]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function legibleHex(color: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return color;
  const rgb = legibleRgb([1, 2, 3].map((i) => Number.parseInt(match[i]!, 16)) as [number, number, number], 4.5);
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** A faction name in its in-game colours, readable on the dark page. */
export function FactionName({ faction, className = "" }: { faction: FactionRef | null; className?: string }) {
  if (!faction) return null;
  const parsed = parseNameRuns(faction.name_raw || faction.name);
  // In-game colours, lifted where a dark one would not read on the page.
  const runs = (parsed.length ? parsed : parseNameRuns(faction.name)).map((run) => ({
    ...run,
    color: legibleHex(run.color),
  }));
  return (
    <span className={className}>
      <FormattedMcRuns runs={runs} />
    </span>
  );
}

/**
 * The faction's map banner (generated per nation colour), or a swatch of its
 * colour when it has none.
 */
export function FactionBanner({
  mapId,
  faction,
  color,
  sessionToken,
  className = "h-24 w-12",
}: {
  mapId: string;
  faction: FactionRef | null;
  color: string;
  sessionToken?: string | null;
  className?: string;
}) {
  const path = bannerPath(mapId, faction);
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`${mapBannerFrameClass} relative shrink-0 ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden={path && !failed ? undefined : true}
    >
      {path && !failed ? (
        <MapAuthImage
          mapId={mapId}
          path={path}
          sessionToken={sessionToken}
          alt={faction ? `${faction.name} banner` : "Banner"}
          className="image-render-pixel absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

export function Swatch({ color, className = "h-3 w-3" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-[3px] ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

/** Two numbers facing each other, with a split bar between the side colours. */
export function PairTile({
  label,
  attacker,
  defender,
  share,
  note,
}: {
  label: string;
  attacker: ReactNode;
  defender: ReactNode;
  /** The attacker's share of the bar, 0..1. */
  share: number;
  note?: string;
}) {
  return (
    <div className="rounded-[8px] border border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] p-3">
      <p className={eyebrowClass}>{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2 font-[family-name:var(--font-fraunces)] text-2xl tabular-nums text-[var(--tfmc-cream)]">
        <span>{attacker}</span>
        <span className="text-sm text-[var(--tfmc-mist)]" aria-hidden>
          vs
        </span>
        <span>{defender}</span>
      </div>
      <SplitBar share={share} className="mt-2 h-1.5" />
      {note ? <p className="mt-1.5 text-xs text-[var(--tfmc-mist)]">{note}</p> : null}
    </div>
  );
}

/** The attacker's colour from the left, the defender's from the right, a 2px gap between. */
export function SplitBar({ share, className = "h-2" }: { share: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, share)) * 1000) / 10;
  return (
    <div aria-hidden className={`flex w-full gap-[2px] overflow-hidden rounded-full ${className}`}>
      {pct > 0 ? (
        <div className="h-full rounded-l-full" style={{ width: `${pct}%`, background: sideVar("attacker") }} />
      ) : null}
      {pct < 100 ? <div className="h-full flex-1 rounded-r-full" style={{ background: sideVar("defender") }} /> : null}
    </div>
  );
}

export function SideLabel({ side }: { side: WarSide }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[var(--tfmc-mist)]">
      <Swatch color={sideVar(side)} className="h-2.5 w-2.5" />
      {SIDE_LABEL[side]}
    </span>
  );
}

export function Count({ value }: { value: number | null | undefined }) {
  return <>{formatCount(value)}</>;
}

/** The page's centred message for loading problems and empty pages. */
export function PageMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className={pageClass}>
      <div className={`${cardClass} mx-auto max-w-xl text-center`}>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--tfmc-cream)]">{title}</h1>
        {children ? <div className={`mt-3 ${mutedClass}`}>{children}</div> : null}
      </div>
    </main>
  );
}
