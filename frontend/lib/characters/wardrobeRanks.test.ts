import { describe, expect, it } from "vitest";
import {
  WARDROBE_MAX_SWAPPABLE,
  WARDROBE_SLOTS,
  WARDROBE_SWAPPABLE_SLOTS,
  wardrobeSkinsNeeded,
  wardrobeSlotUnlocked,
  type SlotLimits,
} from "./api";
import { groupUnlockingSlots, lockLabelForSlot, minSlotsForExtra } from "./wardrobeRanks";

const ladder: SlotLimits = {
  defaults: { wardrobe_skin_slots: 1 },
  groups: [
    { id: "staff", tier: 100, visible: false, wardrobe_skin_slots: 5, display_name: "Staff" },
    { id: "legacy", tier: 4, visible: true, wardrobe_skin_slots: 5, display_name: "Legacy" },
    { id: "ascended", tier: 3, visible: true, wardrobe_skin_slots: 5, display_name: "Ascended" },
    { id: "gilded", tier: 2, visible: true, wardrobe_skin_slots: 3, display_name: "Gilded" },
    { id: "noble", tier: 1, visible: true, wardrobe_skin_slots: 2, display_name: "Noble" },
  ],
};

describe("wardrobe slots", () => {
  it("lists five swappable slots in fill order, then masked", () => {
    expect(WARDROBE_SWAPPABLE_SLOTS).toEqual(["base", "extra_1", "extra_2", "extra_3", "extra_4"]);
    expect(WARDROBE_SLOTS).toEqual([...WARDROBE_SWAPPABLE_SLOTS, "masked"]);
    expect(WARDROBE_MAX_SWAPPABLE).toBe(5);
  });

  it("needs as many skins as the slot's place, and masked or unknown slots need none", () => {
    expect(WARDROBE_SWAPPABLE_SLOTS.map(wardrobeSkinsNeeded)).toEqual([1, 2, 3, 4, 5]);
    expect(wardrobeSkinsNeeded("masked")).toBe(0);
    expect(wardrobeSkinsNeeded("extra_5")).toBe(0);
  });

  it("unlocks a rank's number of skins, keeps masked open and unknown slots locked", () => {
    expect(WARDROBE_SWAPPABLE_SLOTS.map((slot) => wardrobeSlotUnlocked(slot, 3))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(wardrobeSlotUnlocked("masked", 1)).toBe(true);
    expect(wardrobeSlotUnlocked("extra_5", 9)).toBe(false);
  });

  it("asks for the extra frames only", () => {
    expect(["base", "extra_1", "extra_4", "masked", "EXTRA_3", ""].map(minSlotsForExtra)).toEqual([0, 2, 5, 0, 4, 0]);
  });
});

describe("wardrobe lock labels", () => {
  it("name the lowest visible rank with enough skins and never the hidden staff rank", () => {
    expect(groupUnlockingSlots(ladder, 2)?.id).toBe("noble");
    expect(lockLabelForSlot("extra_1", ladder).plain).toBe("Noble+");
    expect(lockLabelForSlot("extra_2", ladder).plain).toBe("Gilded+");
    expect(lockLabelForSlot("extra_3", ladder).plain).toBe("Ascended+");
    expect(lockLabelForSlot("extra_4", ladder).plain).toBe("Ascended+");
  });

  it("fall back to a higher rank when no visible rank grants the slot", () => {
    const onlyStaff: SlotLimits = { groups: [ladder.groups![0]] };
    expect(lockLabelForSlot("extra_4", onlyStaff).plain).toBe("a higher rank");
    expect(lockLabelForSlot("base", ladder).plain).toBe("a higher rank");
    expect(lockLabelForSlot("extra_2", undefined).plain).toBe("a higher rank");
  });
});
