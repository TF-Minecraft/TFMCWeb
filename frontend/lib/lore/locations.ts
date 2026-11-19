import type { LocationKind } from "./api";

/** The world the site map draws. Locations in other worlds are listed but not drawn. */
export const MAP_WORLD = "TFMC_Map";

/** A glyph and colour per kind, for map markers and the list. */
export const KIND_MARK: Record<LocationKind, { glyph: string; colour: string; label: string }> = {
  settlement: { glyph: "⌂", colour: "#f4c96b", label: "Settlement" },
  landmark: { glyph: "★", colour: "#8fc7e8", label: "Landmark" },
  camp: { glyph: "▲", colour: "#e8a35f", label: "Camp" },
  ruin: { glyph: "☗", colour: "#b8a8d8", label: "Ruin" },
  event: { glyph: "!", colour: "#e8796f", label: "Event site" },
  other: { glyph: "•", colour: "#e8e4d9", label: "Other" },
};

/** The in-game command to go to a location; an unknown height keeps the player's own. */
export function tpCommand(x: number, y: number | null | undefined, z: number): string {
  return `/tp ${x} ${y ?? "~"} ${z}`;
}

/**
 * A typed block coordinate. Empty gives null (fine only for optional fields);
 * anything that is not a whole number gives undefined.
 */
export function parseCoord(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^-?\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

/** Locations whose name, kind, world or summary contain every word of `query`. */
export function filterLocations<T extends { name: string; kind: LocationKind; world: string; summary: string }>(
  rows: T[],
  query: string,
): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter((row) => {
    const hay = `${row.name} ${KIND_MARK[row.kind]?.label ?? row.kind} ${row.world} ${row.summary}`.toLowerCase();
    return words.every((word) => hay.includes(word));
  });
}
