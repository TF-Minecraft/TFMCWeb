import type { CatalogEntitlements } from "./catalog";
import type { SkinKind } from "./sizes";
import { ARMOR_METALS, ARMOR_SINGLE_SETS, kindsForBaseSet } from "./baseSets";

/** What a skin goes on: an item base set, an armour metal line, or one single armour set. */
export type SkinTarget =
  | { type: "item"; baseSet: string }
  | { type: "metal"; metal: string }
  | { type: "single"; set: string };

/** Upload kinds that can skin a target, in base_sets.json order. */
export function kindsForTarget(target: SkinTarget): readonly SkinKind[] {
  if (target.type === "item") return kindsForBaseSet(target.baseSet);
  return ["armor_set"];
}

export function sameTarget(a: SkinTarget | null, b: SkinTarget | null): boolean {
  if (!a || !b) return a === b;
  if (a.type === "item" && b.type === "item") return a.baseSet === b.baseSet;
  if (a.type === "metal" && b.type === "metal") return a.metal === b.metal;
  if (a.type === "single" && b.type === "single") return a.set === b.set;
  return false;
}

/** Every armour target: metal lines first, then single sets. */
export const ARMOR_TARGETS: readonly SkinTarget[] = [
  ...ARMOR_METALS.map((metal) => ({ type: "metal" as const, metal })),
  ...ARMOR_SINGLE_SETS.map((s) => ({ type: "single" as const, set: s.id })),
];

/** `null` allowed list means everything (staff); otherwise case-insensitive membership. */
export function kindAllowed(kind: string, allowed: readonly string[] | null | undefined): boolean {
  if (allowed == null) return true;
  return allowed.some((k) => k.toLowerCase() === kind);
}

/**
 * The lowest rank whose group lists a kind (ranks include every lower rank's kinds), or
 * null when no rank grants it.
 */
export function rankForKind(entitlements: CatalogEntitlements | null | undefined, kind: string): string | null {
  const groups = [...(entitlements?.groups ?? [])].sort((a, b) => a.tier - b.tier);
  const group = groups.find((g) => g.skin_kinds.some((k) => k.toLowerCase() === kind));
  return group ? group.display_name || group.id : null;
}

/** First kind for a target the player may upload, else null. */
export function firstAllowedKind(target: SkinTarget, allowed: readonly string[] | null | undefined): SkinKind | null {
  return kindsForTarget(target).find((kind) => kindAllowed(kind, allowed)) ?? null;
}
