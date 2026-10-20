import { MAX_PAINTABLE_PROVINCE_ID, type NationColorLut } from "./chroniclePaint";

/**
 * The coalition map mode, read from `coalition_map.json`: the coalitions the
 * backend (`backend/src/scripts/mapgen/coalitiongen.py`) resolved against that
 * day's realms, plus which coalition holds each province and which ones target
 * it.
 *
 * The live map draws this mode as a server raster (`/{map}/mapdata/coalition`)
 * with hatched targets. A stored day paints it here instead, one colour per
 * province, so it cannot hatch: target land is painted in the hatch colour at
 * a lighter alpha, which keeps it reading as "marked" rather than as a member.
 */

/**
 * The alpha a stored day paints target land with. Mirrors `DAY_TARGET_ALPHA`
 * in `coalitiongen.py`; member land uses the alpha baked into `fill_rgba`.
 */
export const CHRONICLE_COALITION_TARGET_ALPHA = 120;

type Rgba = readonly [number, number, number, number];

function rgba(value: unknown): Rgba | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  if (!value.every((c) => Number.isInteger(c) && c >= 0 && c <= 255)) return null;
  return value as unknown as Rgba;
}

function pack([r, g, b, a]: Rgba): number {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

function provinceId(id: unknown): number | null {
  const numeric = typeof id === "number" ? id : typeof id === "string" && id.trim() !== "" ? Number(id) : NaN;
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > MAX_PAINTABLE_PROVINCE_ID) return null;
  return numeric;
}

/**
 * Province id -> packed colour for one day's coalition map.
 *
 * Unvalidated network JSON, so every surprise is a skipped row rather than a
 * throw: a payload that is not an object, a coalition without an id or with a
 * malformed colour, a province row whose id is not a positive integer in range,
 * or one naming coalitions the file does not list. A province in a coalition
 * takes that coalition's fill even when another coalition targets it, as on
 * the live raster.
 */
export function buildCoalitionColorLut(payload: unknown): NationColorLut {
  if (!payload || typeof payload !== "object") return new Uint32Array(0);
  const { coalitions, provinces } = payload as { coalitions?: unknown; provinces?: unknown };
  if (!Array.isArray(coalitions) || !Array.isArray(provinces)) return new Uint32Array(0);

  const fills = new Map<string, number>();
  const targets = new Map<string, number>();
  for (const row of coalitions) {
    if (!row || typeof row !== "object") continue;
    const { id, fill_rgba, hatch_rgba } = row as { id?: unknown; fill_rgba?: unknown; hatch_rgba?: unknown };
    if (typeof id !== "string" || !id) continue;
    const fill = rgba(fill_rgba);
    const hatch = rgba(hatch_rgba);
    if (fill) fills.set(id, pack(fill));
    if (hatch) targets.set(id, pack([hatch[0], hatch[1], hatch[2], CHRONICLE_COALITION_TARGET_ALPHA]));
  }

  const usable: { id: number; packed: number }[] = [];
  let maxProvinceId = 0;
  for (const row of provinces) {
    if (!row || typeof row !== "object") continue;
    const { id, coalition, targeted_by } = row as { id?: unknown; coalition?: unknown; targeted_by?: unknown };
    const pid = provinceId(id);
    if (pid === null) continue;

    let packed = typeof coalition === "string" ? fills.get(coalition) : undefined;
    if (packed === undefined && Array.isArray(targeted_by)) {
      const first = targeted_by.find((c): c is string => typeof c === "string" && targets.has(c));
      if (first !== undefined) packed = targets.get(first);
    }
    if (packed === undefined) continue;

    usable.push({ id: pid, packed });
    if (pid > maxProvinceId) maxProvinceId = pid;
  }

  if (!maxProvinceId) return new Uint32Array(0);
  const lut = new Uint32Array(maxProvinceId + 1);
  for (const { id, packed } of usable) lut[id] = packed;
  return lut;
}

/**
 * The coalition lines of a province tooltip, from `/compiled_data/provinces`.
 *
 * A stored day's `province_data` carries no coalition fields at all, so it
 * yields no lines rather than claiming the province was in no coalition.
 */
export function coalitionTooltipLines(data: {
  coalition?: unknown;
  coalition_member?: unknown;
  coalition_leader?: unknown;
  coalition_target?: unknown;
  coalition_offensive?: unknown;
  coalition_targeted_by?: unknown;
}): string[] {
  if (!("coalition" in data) && !("coalition_targeted_by" in data)) return [];

  const lines: string[] = [];
  const text = (value: unknown) => (typeof value === "string" && value ? value : null);
  const name = text(data.coalition);
  if (name) {
    const stance = data.coalition_offensive === true ? "offensive" : "defensive";
    lines.push(`Coalition: ${name} (${stance})`);
    const member = text(data.coalition_member);
    if (member) lines.push(`Member: ${member}`);
    const leader = text(data.coalition_leader);
    if (leader) lines.push(`Leader: ${leader}`);
    const target = text(data.coalition_target);
    if (target) lines.push(`Against: ${target}`);
  }

  const targetedBy = Array.isArray(data.coalition_targeted_by)
    ? data.coalition_targeted_by.filter((c): c is string => typeof c === "string" && c.length > 0)
    : [];
  if (targetedBy.length) lines.push(`Opposed by: ${targetedBy.join(", ")}`);

  if (!lines.length) lines.push("Coalition: None");
  return lines;
}
