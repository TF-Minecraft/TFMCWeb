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
    blurb:
      "Grow field crops and 27 new fruits, vegetables and spices, and learn why crops need open sky and fertile land.",
  },
  commands: farmingCommands,
};
