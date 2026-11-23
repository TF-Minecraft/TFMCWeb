import { describe, expect, it } from "vitest";
import { DEV_CATALOG_ENTITLEMENTS } from "./entitlementsDev";
import { firstAllowedKind, kindAllowed, kindsForTarget, rankForKind } from "./kindAccess";

describe("kindsForTarget", () => {
  it("returns the item's styles, flat first", () => {
    expect(kindsForTarget({ type: "item", baseSet: "longbows" })).toEqual(["large_bow", "bow_3d"]);
    expect(kindsForTarget({ type: "single", set: "leather" })).toEqual(["armor_set"]);
  });
});

describe("rank locks", () => {
  it("names the lowest rank that grants a kind", () => {
    expect(rankForKind(DEV_CATALOG_ENTITLEMENTS, "bow_3d")).toBe("Ascended");
    expect(rankForKind(DEV_CATALOG_ENTITLEMENTS, "handheld")).toBe("Noble");
    expect(rankForKind(DEV_CATALOG_ENTITLEMENTS, "nope")).toBeNull();
  });

  it("keeps the colour codes and falls back to the id when the name is codes alone", () => {
    const group = (id: string, display_name: string) => ({
      ...DEV_CATALOG_ENTITLEMENTS.groups[0]!,
      id,
      display_name,
      tier: 1,
      skin_kinds: ["bow"],
    });
    const withName = (display_name: string) => ({
      ...DEV_CATALOG_ENTITLEMENTS,
      groups: [group("gilded", display_name)],
    });
    expect(rankForKind(withName("&#FDAA17G&#FB9C14i"), "bow")).toBe("&#FDAA17G&#FB9C14i");
    expect(rankForKind(withName("&#FDAA17&l"), "bow")).toBe("gilded");
    expect(rankForKind(withName(""), "bow")).toBe("gilded");
  });

  it("treats a missing list as everything (staff)", () => {
    expect(kindAllowed("bow_3d", null)).toBe(true);
    expect(kindAllowed("bow_3d", ["bow"])).toBe(false);
  });

  it("starts on the first style the player can use", () => {
    expect(firstAllowedKind({ type: "item", baseSet: "wands" }, ["item_3d"])).toBe("item_3d");
    expect(firstAllowedKind({ type: "item", baseSet: "wands" }, ["bow"])).toBeNull();
  });
});
