import type { WikiCommandSet, WikiSection } from "./types";

/** CustomCrops and Cooking farming have no player commands; every command carries an admin node. */
export const farmingCommands: WikiCommandSet = {
  system: "Farming",
  href: "/wiki/farming",
  commands: [],
};

export const farmingSection: WikiSection = {
  nav: {
    href: "/wiki/farming",
    label: "Farming",
    category: "gathering",
    blurb: "Field crops and hoes, 30 custom crops, open sky and province fertility.",
  },
  commands: farmingCommands,
};
