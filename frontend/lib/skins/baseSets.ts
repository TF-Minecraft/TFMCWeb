import catalog from "../../../shared/skins/base_sets.json";
import type { SkinKind } from "./sizes";

/**
 * What a player skin can apply to, from shared/skins/base_sets.json (the backend reads
 * the same file). Each base set id is the ArmourShop base-sets.yml key.
 */

export type BaseSetGroup = { id: string; label: string };

export type BaseSetEntry = {
  id: string;
  label: string;
  group: string;
  kinds: readonly SkinKind[];
};

export type ArmorSingleSet = { id: string; label: string; detail: string };

export const BASE_SET_GROUPS: readonly BaseSetGroup[] = catalog.groups;

export const BASE_SET_ENTRIES: readonly BaseSetEntry[] = catalog.base_sets.map((row) => ({
  ...row,
  kinds: row.kinds as SkinKind[],
}));

/**
 * One armour submission is one metal line: up to one set per type, all the same
 * metal — or exactly one single set (leather, a mage school…).
 */
export const ARMOR_TYPES = catalog.armor.types.map((t) => t.id) as readonly string[];

export type ArmorType = string;

export const ARMOR_METALS = catalog.armor.metals.map((m) => m.id) as readonly string[];

export const ARMOR_SINGLE_SETS: readonly ArmorSingleSet[] = catalog.armor.single_sets;

/** Shared byte caps (limits in base_sets.json). */
export const RANGED_3D_TOTAL_BYTES: number = catalog.limits.ranged_3d_total_bytes;
export const MCMETA_MAX_BYTES: number = catalog.limits.mcmeta_max_bytes;

export function isArmorSingleSet(id: string): boolean {
  return ARMOR_SINGLE_SETS.some((s) => s.id === id);
}

/** Tier id sent to the backend: `light_iron`. Its shop base set is `light iron`. */
export function armorTier(type: string, metal: string): string {
  return `${type}_${metal}`;
}

/** `light_iron` → "Light Iron"; older bare tiers (`iron`, `mage`) → "Iron", "Mage". */
export function armorTierLabel(tier: string): string {
  return tier
    .split("_")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function setsFor(kind: SkinKind): readonly string[] {
  if (kind === "armor_set") return ARMOR_METALS;
  return BASE_SET_ENTRIES.filter((row) => row.kinds.includes(kind)).map((row) => row.id);
}

/** Base sets each kind may target; armour picks its metal here. */
export const BASE_SETS: Record<SkinKind, readonly string[]> = {
  armor_set: setsFor("armor_set"),
  handheld: setsFor("handheld"),
  large_handheld: setsFor("large_handheld"),
  bow: setsFor("bow"),
  large_bow: setsFor("large_bow"),
  crossbow: setsFor("crossbow"),
  bow_3d: setsFor("bow_3d"),
  crossbow_3d: setsFor("crossbow_3d"),
  item_3d: setsFor("item_3d"),
  shield: setsFor("shield"),
  helmet_3d: setsFor("helmet_3d"),
  mask: setsFor("mask"),
  gun: setsFor("gun"),
  book: setsFor("book"),
};

const LABELS: Record<string, string> = Object.fromEntries([
  ...catalog.armor.metals.map((m) => [m.id, m.label]),
  ...catalog.armor.single_sets.map((s) => [s.id, s.label]),
  ...catalog.base_sets.map((row) => [row.id, row.label]),
]);

export function baseSetsForKind(kind: SkinKind): readonly string[] {
  return BASE_SETS[kind];
}

export function baseSetEntry(id: string): BaseSetEntry | undefined {
  return BASE_SET_ENTRIES.find((row) => row.id === id);
}

/** Upload kinds that can target a base set, in the order the file lists them. */
export function kindsForBaseSet(id: string): readonly SkinKind[] {
  return baseSetEntry(id)?.kinds ?? [];
}

export function baseSetLabel(id: string): string {
  return LABELS[id] ?? id;
}

export function defaultBaseSet(kind: SkinKind): string {
  return BASE_SETS[kind][0] ?? "";
}

export function baseSetPickerTitle(kind: SkinKind): string {
  return kind === "armor_set" ? "Metal" : "Item type";
}
