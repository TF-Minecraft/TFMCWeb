import type { WikiCommandSet, WikiSection } from "./types";

/** CustomCrops has no player commands; every command in commands.yml carries an admin node. */
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
    blurb: "Grow 30 custom crops in watered pots, and speed them up with fertiliser.",
  },
  commands: farmingCommands,
};
