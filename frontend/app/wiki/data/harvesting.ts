import type { WikiCommandSet, WikiSection } from "./types";

/** FarmingUpgrade has no player commands. It is purely passive vanilla-crop mechanics. */
export const harvestingCommands: WikiCommandSet = {
  system: "FarmingUpgrade",
  href: "/wiki/harvesting",
  commands: [],
};

export const harvestingSection: WikiSection = {
  nav: {
    href: "/wiki/harvesting",
    label: "Crop Harvesting",
    category: "gathering",
    blurb: "Harvest and replant vanilla crops over an area with a hoe.",
  },
  commands: harvestingCommands,
};
