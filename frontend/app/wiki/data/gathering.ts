import type { WikiCommandSet, WikiSection } from "./types";

// ---------- Gathering ----------
//
// Gathering has no crafting-table recipe of its own: spots spawn in the
// world automatically, there is nothing to build. No `recipes` export here.

export const gatheringCommands: WikiCommandSet = {
  system: "Gathering",
  href: "/wiki/gathering",
  commands: [],
};

export const gatheringSection: WikiSection = {
  nav: {
    href: "/wiki/gathering",
    label: "Gathering",
    category: "professions",
    blurb: "Notice hidden gathering spots in the wild and right-click them for loot.",
  },
  commands: gatheringCommands,
};
