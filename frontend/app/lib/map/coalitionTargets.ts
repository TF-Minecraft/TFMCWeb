import { cleanRegionName } from "@/app/lib/mapLabels";

/** What a hovered province's tooltip says about the coalitions aimed at it. */
export type ProvinceNote = { text: string; hint: string };

type CoalitionTargetFields = {
  name?: unknown;
  target?: unknown;
  target_name?: unknown;
  target_provinces?: unknown;
};

/**
 * Province id -> the realm it belongs to as a target, and the coalitions
 * aimed at it, from the coalition map's region records.
 *
 * `firstId` (the open coalition) is listed first wherever it is one of the
 * claimants, so the tooltip leads with the coalition whose hatch is showing.
 * Records arrive over the wire, so anything malformed is skipped.
 */
export function buildCoalitionTargetNotes(
  regionData: Record<string, unknown> | null,
  firstId: string | null = null,
): (provinceId: number) => ProvinceNote | null {
  const byProvince = new Map<number, { target: string; coalitions: string[] }>();
  if (regionData) {
    const ids = Object.keys(regionData);
    if (firstId && ids.includes(firstId)) ids.sort((a, b) => Number(b === firstId) - Number(a === firstId));
    for (const id of ids) {
      const record = regionData[id] as CoalitionTargetFields | undefined;
      if (!record || !Array.isArray(record.target_provinces)) continue;
      const coalition = cleanRegionName(typeof record.name === "string" ? record.name : id) || id;
      const rawTarget =
        typeof record.target_name === "string" && record.target_name
          ? record.target_name
          : typeof record.target === "string"
            ? record.target
            : "";
      const target = cleanRegionName(rawTarget) || rawTarget;
      if (!target) continue;
      for (const provinceId of record.target_provinces) {
        if (!Number.isInteger(provinceId) || provinceId <= 0) continue;
        const entry = byProvince.get(provinceId);
        if (!entry) byProvince.set(provinceId, { target, coalitions: [coalition] });
        else if (!entry.coalitions.includes(coalition)) entry.coalitions.push(coalition);
      }
    }
  }
  return (provinceId) => {
    const entry = byProvince.get(provinceId);
    return entry ? { text: entry.target, hint: `Target of ${entry.coalitions.join(", ")}` } : null;
  };
}
