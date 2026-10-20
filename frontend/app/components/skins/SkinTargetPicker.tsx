"use client";

import { useState } from "react";
import {
  ARMOR_SINGLE_SETS,
  ARMOR_TYPES,
  BASE_SET_ENTRIES,
  BASE_SET_GROUPS,
  armorTierLabel,
  baseSetLabel,
} from "../../../lib/skins/baseSets";
import { ARMOR_TARGETS, kindsForTarget, sameTarget, type SkinTarget } from "../../../lib/skins/kindAccess";
import type { SkinKind } from "../../../lib/skins/sizes";
import { LockIcon, kindStyle } from "./KindPicker";

type Tile = {
  target: SkinTarget;
  label: string;
  detail: string;
  keywords: string;
};

type Section = { id: string; label: string; tiles: Tile[] };

function styleSummary(kinds: readonly SkinKind[]): string {
  const styles = kinds.map((k) => (kindStyle(k).style.startsWith("3D") ? "3D" : "Flat"));
  return [...new Set(styles)].join(" · ");
}

const ARMOR_TYPE_SUMMARY = ARMOR_TYPES.map((t) => armorTierLabel(t)).join(" · ");

function buildSections(): Section[] {
  const metals: Tile[] = ARMOR_TARGETS.filter((t) => t.type === "metal").map((target) => {
    const metal = target.type === "metal" ? target.metal : "";
    return {
      target,
      label: baseSetLabel(metal),
      detail: ARMOR_TYPE_SUMMARY,
      keywords: `${metal} armour armor ${ARMOR_TYPES.join(" ")}`,
    };
  });
  const singles: Tile[] = ARMOR_SINGLE_SETS.map((s) => ({
    target: { type: "single" as const, set: s.id },
    label: s.label,
    detail: s.detail,
    keywords: `${s.id} ${s.label} ${s.detail} armour armor`,
  }));
  const sections: Section[] = [
    { id: "armor_metal", label: "Armour · metal lines", tiles: metals },
    { id: "armor_single", label: "Armour · single sets", tiles: singles },
  ];
  for (const group of BASE_SET_GROUPS) {
    sections.push({
      id: group.id,
      label: group.label,
      tiles: BASE_SET_ENTRIES.filter((row) => row.group === group.id).map((row) => ({
        target: { type: "item" as const, baseSet: row.id },
        label: row.label,
        detail: styleSummary(row.kinds),
        keywords: `${row.id} ${row.label} ${group.label}`,
      })),
    });
  }
  return sections;
}

const SECTIONS = buildSections();

type Props = {
  value: SkinTarget | null;
  onChange: (target: SkinTarget) => void;
  disabled?: boolean;
  /** Rank that unlocks a target the player can't skin at all, else undefined. */
  lockedBy: (kinds: readonly SkinKind[]) => string | undefined;
};

/** Step 1: pick the item (or armour line) the skin goes on. */
export default function SkinTargetPicker({ value, onChange, disabled, lockedBy }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = SECTIONS.map((section) => ({
    ...section,
    tiles: needle
      ? section.tiles.filter((tile) => `${tile.keywords} ${section.label}`.toLowerCase().includes(needle))
      : section.tiles,
  })).filter((section) => section.tiles.length > 0);

  return (
    <fieldset className="flex flex-col gap-4 border-0 p-0">
      <legend className="sr-only">What are you skinning?</legend>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="m-0 text-xs text-[var(--tfmc-mist)]">Pick the item or armour your skin goes on.</p>
        <label className="flex w-full flex-col gap-1 sm:w-56">
          <span className="sr-only">Search items</span>
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: wand, crossbow, leather…"
            className="rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_25%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_40%,transparent)] px-3 py-1.5 text-sm text-[var(--tfmc-cream)] outline-none placeholder:text-[color-mix(in_srgb,var(--tfmc-mist)_60%,transparent)] focus:border-[var(--tfmc-accent)]"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--tfmc-mist)]">Nothing matches “{query.trim()}”.</p>
      ) : (
        visible.map((section) => (
          <div key={section.id} className="flex flex-col gap-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[var(--tfmc-mist)]">
              {section.label}
            </p>
            <div
              role="radiogroup"
              aria-label={section.label}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
            >
              {section.tiles.map((tile) => {
                const selected = sameTarget(value, tile.target);
                const lock = lockedBy(kindsForTarget(tile.target));
                return (
                  <button
                    key={`${section.id}:${tile.label}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled || Boolean(lock)}
                    title={lock ? `Unlocks at ${lock}` : tile.detail}
                    onClick={() => onChange(tile.target)}
                    className={`relative flex min-h-[3.5rem] flex-col justify-center rounded-sm border px-3 py-2 text-left transition duration-150 disabled:cursor-not-allowed ${
                      lock ? "opacity-55" : "disabled:opacity-50"
                    } ${
                      selected
                        ? "border-[var(--tfmc-accent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_18%,var(--tfmc-forest))] shadow-[inset_3px_0_0_0_var(--tfmc-accent)]"
                        : "border-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] enabled:hover:border-[color-mix(in_srgb,var(--tfmc-accent)_45%,var(--tfmc-cream))] enabled:hover:bg-[color-mix(in_srgb,var(--tfmc-moss)_55%,var(--tfmc-forest))]"
                    } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)]`}
                  >
                    <span className="truncate text-sm font-medium text-[var(--tfmc-cream)]">{tile.label}</span>
                    <span className="truncate text-[11px] text-[var(--tfmc-mist)]">
                      {lock ? (
                        <>
                          <LockIcon /> {lock}
                        </>
                      ) : (
                        tile.detail
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </fieldset>
  );
}
