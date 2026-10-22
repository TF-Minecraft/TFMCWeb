import { describe, expect, it } from "vitest";
import catalog from "../../../shared/skins/base_sets.json";
import {
  ARMOR_METALS,
  ARMOR_SINGLE_SETS,
  ARMOR_TYPES,
  BASE_SET_ENTRIES,
  BASE_SET_GROUPS,
  RANGED_3D_TOTAL_BYTES,
  armorTier,
  armorTierLabel,
  baseSetLabel,
  baseSetsForKind,
  kindsForBaseSet,
} from "./baseSets";

describe("base sets from shared/skins/base_sets.json", () => {
  it("lists every base set of the shared file once", () => {
    expect(BASE_SET_ENTRIES.map((row) => row.id)).toEqual(catalog.base_sets.map((row) => row.id));
    const groups = new Set(BASE_SET_GROUPS.map((g) => g.id));
    expect(BASE_SET_ENTRIES.every((row) => groups.has(row.group))).toBe(true);
  });

  it("offers wands and mage blades flat and in 3D", () => {
    expect(baseSetsForKind("handheld")).toEqual(
      expect.arrayContaining(["wands", "mage blades", "pickaxes", "shovels"]),
    );
    expect(baseSetsForKind("item_3d")).toEqual(expect.arrayContaining(["wands", "mage blades", "lutes"]));
    expect(baseSetLabel("mage blades")).toBe("Mage blades");
  });

  it("puts longswords and greataxes on 32×32 and keeps lutes off it", () => {
    expect(baseSetsForKind("large_handheld")).toEqual(expect.arrayContaining(["longswords", "greataxes"]));
    expect(baseSetsForKind("large_handheld")).not.toContain("lutes");
  });

  it("keeps battle standards 3D only", () => {
    expect(kindsForBaseSet("battle standards")).toEqual(["item_3d"]);
  });

  it("keeps crutches 3D only", () => {
    expect(kindsForBaseSet("crutches")).toEqual(["item_3d"]);
    expect(baseSetLabel("crutches")).toBe("Crutches");
  });

  it("gives every bow a 3D style", () => {
    expect(baseSetsForKind("bow_3d")).toEqual(["shortbows", "longbows"]);
    expect(baseSetsForKind("crossbow_3d")).toEqual(["crossbows"]);
    expect(RANGED_3D_TOTAL_BYTES).toBe(61440);
  });
});

describe("armour metal lines", () => {
  it("names each set by type and metal", () => {
    expect(armorTier("light", "iron")).toBe("light_iron");
    expect(armorTierLabel("heavy_abyssalite")).toBe("Heavy Abyssalite");
  });

  it("still labels older bare tiers and single sets", () => {
    expect(armorTierLabel("mage")).toBe("Mage");
    expect(armorTierLabel("wild_mage")).toBe("Wild Mage");
  });

  it("offers one metal per submission and five set types", () => {
    expect(baseSetsForKind("armor_set")).toEqual(ARMOR_METALS);
    expect(ARMOR_TYPES).toHaveLength(5);
  });

  it("offers leather and the mage schools as single sets", () => {
    expect(ARMOR_SINGLE_SETS.map((s) => s.id)).toEqual(expect.arrayContaining(["leather", "illusion", "shadowmancy"]));
    expect(ARMOR_SINGLE_SETS.map((s) => s.id)).not.toContain("exploration");
  });
});
