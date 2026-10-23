import { magicRecipes } from "./magic";
import type { WikiCommandSet, WikiSection } from "./types";

export const mageWeaponCommands: WikiCommandSet = {
  system: "Magic",
  href: "/wiki/mage-weapons",
  commands: [
    {
      command: "/magic rune keybind <key>",
      description:
        "While holding a spell rune, changes the key that casts it: RIGHT_CLICK, LEFT_CLICK, SHIFT_RIGHT_CLICK or SHIFT_LEFT_CLICK.",
    },
  ],
};

export const mageWeaponsSection: WikiSection = {
  nav: {
    href: "/wiki/mage-weapons",
    label: "Mage Weapons",
    category: "magic",
    blurb: "Build a staff, wand or blade, attune it with a charge, and fit spell runes.",
  },
  recipes: magicRecipes,
  commands: mageWeaponCommands,
};
