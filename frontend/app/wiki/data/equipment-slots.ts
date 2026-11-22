import type { WikiCommandSet, WikiSection } from "./types";

// ---------- MMOInventory: Extra Equipment Slots ----------

/** No player command exists for the live inventory. It is `type: vanilla`, so slots sit in your normal inventory. */
export const equipmentSlotsCommands: WikiCommandSet = {
  system: "Equipment Slots",
  href: "/wiki/equipment-slots",
  commands: [],
};

export const equipmentSlotsSection: WikiSection = {
  nav: {
    href: "/wiki/equipment-slots",
    label: "Equipment Slots",
    category: "character",
    blurb: "4 inventory slots for a ring, an amulet and 2 jewellery artifacts.",
  },
  commands: equipmentSlotsCommands,
};
