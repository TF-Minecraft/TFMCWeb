"use client";

import { useState } from "react";
import type { SkinKind } from "../../../lib/skins/sizes";
import { KindHelpPanel, KindHelpToggle, useKindHelpId } from "./KindHelp";

const KINDS: Record<SkinKind, { label: string; style: string; detail: string }> = {
  armor_set: {
    label: "Armour set",
    style: "Armour",
    detail: "Icons + body layers per set",
  },
  handheld: { label: "Handheld", style: "Flat", detail: "16×16 texture" },
  large_handheld: {
    label: "Large handheld",
    style: "Flat (large)",
    detail: "32×32 + grip slider",
  },
  bow: { label: "Bow", style: "Flat frames", detail: "16×16 · 4 frames" },
  large_bow: {
    label: "Large bow",
    style: "Flat frames (large)",
    detail: "32×32 · 4 frames",
  },
  crossbow: {
    label: "Crossbow",
    style: "Flat frames",
    detail: "16×16 · 5 frames",
  },
  bow_3d: {
    label: "3D bow",
    style: "3D model",
    detail: "1 texture + 4 models · 60 KB total",
  },
  crossbow_3d: {
    label: "3D crossbow",
    style: "3D model",
    detail: "1 texture + 5 models · 60 KB total",
  },
  item_3d: { label: "Item 3D", style: "3D model", detail: "Model + texture" },
  shield: {
    label: "Shield 3D",
    style: "3D model",
    detail: "Model + texture · idle and blocking",
  },
  helmet_3d: {
    label: "Helmet 3D",
    style: "3D model",
    detail: "Model + texture",
  },
  mask: {
    label: "Mask",
    style: "3D mask",
    detail: "3D helmet · hides identity",
  },
  gun: { label: "Gun", style: "3D model", detail: "Carry · reload · aim" },
  book: {
    label: "Book",
    style: "Flat covers",
    detail: "Unsigned + signed · 16×16",
  },
};

/** Player-facing label for a skin kind. */
export function kindLabel(kind: string): string {
  return KINDS[kind as SkinKind]?.label ?? kind;
}

/** Short style name and file summary for a kind (e.g. "3D model", "Model + texture"). */
export function kindStyle(kind: SkinKind): { style: string; detail: string } {
  return KINDS[kind];
}

type Props = {
  /** Styles the chosen item supports. */
  kinds: readonly SkinKind[];
  value: SkinKind | null;
  onChange: (kind: SkinKind) => void;
  disabled?: boolean;
  /** Rank name that unlocks a kind the player can't use, or undefined when it's usable. */
  lockedBy: (kind: SkinKind) => string | undefined;
};

/** Step 2: choose how the chosen item is skinned (flat, 3D…). */
export default function KindPicker({ kinds, value, onChange, disabled, lockedBy }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useKindHelpId();

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="sr-only">Style</legend>
      {value ? (
        <div className="flex items-center gap-2">
          <KindHelpToggle open={helpOpen} panelId={helpId} onToggle={() => setHelpOpen((v) => !v)} />
          <span className="text-xs text-[var(--tfmc-mist)]">How {kindLabel(value).toLowerCase()} skins work</span>
        </div>
      ) : null}

      <div role="radiogroup" aria-label="Skin style" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {kinds.map((kind) => {
          const selected = value === kind;
          const lock = lockedBy(kind);
          const { style, detail } = kindStyle(kind);
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={Boolean(lock)}
              disabled={disabled || Boolean(lock)}
              onClick={() => onChange(kind)}
              title={lock ? `Unlocks at ${lock}` : undefined}
              className={`group relative overflow-hidden rounded-sm border px-3.5 py-3 text-left transition duration-200 ease-out disabled:cursor-not-allowed ${
                lock ? "opacity-60" : "disabled:opacity-50"
              } ${
                selected
                  ? "animate-kind-tile-in border-[var(--tfmc-accent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_18%,var(--tfmc-forest))] shadow-[inset_3px_0_0_0_var(--tfmc-accent)]"
                  : "border-[color-mix(in_srgb,var(--tfmc-cream)_16%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] enabled:hover:-translate-y-0.5 enabled:hover:border-[color-mix(in_srgb,var(--tfmc-accent)_45%,var(--tfmc-cream))] enabled:hover:bg-[color-mix(in_srgb,var(--tfmc-moss)_55%,var(--tfmc-forest))]"
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)]`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--tfmc-cream)]">{style}</span>
                  <span className="mt-0.5 block text-xs text-[var(--tfmc-mist)]">{detail}</span>
                </span>
                {lock ? (
                  <span className="shrink-0 rounded-sm border border-[color-mix(in_srgb,var(--tfmc-accent)_45%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tfmc-accent)]">
                    <LockIcon /> {lock}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border transition ${
                      selected
                        ? "border-[var(--tfmc-accent)] bg-[var(--tfmc-accent)]"
                        : "border-[color-mix(in_srgb,var(--tfmc-cream)_30%,transparent)]"
                    }`}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {value ? <KindHelpPanel kind={value} open={helpOpen} id={helpId} /> : null}
    </fieldset>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="mb-px inline h-2.5 w-2.5" fill="currentColor">
      <path d="M3.5 5V3.75a2.5 2.5 0 0 1 5 0V5h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h.5Zm1 0h3V3.75a1.5 1.5 0 0 0-3 0V5Z" />
    </svg>
  );
}
