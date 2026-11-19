import { describe, expect, it } from "vitest";

import { LOCATION_KINDS } from "./api";
import { filterLocations, KIND_MARK, parseCoord, tpCommand } from "./locations";

describe("tpCommand", () => {
  it("uses ~ for an unknown height", () => {
    expect(tpCommand(120, null, -45)).toBe("/tp 120 ~ -45");
    expect(tpCommand(120, undefined, -45)).toBe("/tp 120 ~ -45");
  });
  it("keeps a known height, zero included", () => {
    expect(tpCommand(-3, 0, 7)).toBe("/tp -3 0 7");
    expect(tpCommand(1, 64, 2)).toBe("/tp 1 64 2");
  });
});

describe("parseCoord", () => {
  it("reads whole numbers", () => {
    expect(parseCoord(" 42 ")).toBe(42);
    expect(parseCoord("-17")).toBe(-17);
  });
  it("gives null when empty and undefined when not a whole number", () => {
    expect(parseCoord("  ")).toBeNull();
    expect(parseCoord("4.5")).toBeUndefined();
    expect(parseCoord("abc")).toBeUndefined();
    expect(parseCoord("1e3")).toBeUndefined();
  });
});

describe("KIND_MARK", () => {
  it("has a mark for every kind", () => {
    for (const kind of LOCATION_KINDS) expect(KIND_MARK[kind].glyph).toBeTruthy();
  });
});

describe("filterLocations", () => {
  const rows = [
    { id: 1, name: "Old Harbour", kind: "settlement" as const, world: "TFMC_Map", summary: "Fishing town" },
    { id: 2, name: "Watchtower", kind: "ruin" as const, world: "TFMC_Map", summary: "" },
    { id: 3, name: "Nether gate", kind: "landmark" as const, world: "world_nether", summary: "" },
  ];
  it("returns everything for an empty query", () => {
    expect(filterLocations(rows, "  ")).toHaveLength(3);
  });
  it("matches every word across name, kind, world and summary", () => {
    expect(filterLocations(rows, "harbour fishing").map((r) => r.id)).toEqual([1]);
    expect(filterLocations(rows, "RUIN").map((r) => r.id)).toEqual([2]);
    expect(filterLocations(rows, "nether").map((r) => r.id)).toEqual([3]);
    expect(filterLocations(rows, "harbour ruin")).toEqual([]);
  });
});
