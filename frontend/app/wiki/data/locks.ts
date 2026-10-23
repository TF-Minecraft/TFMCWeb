import type { WikiCommandSet, WikiSection } from "./types";

// Thievery 1.8.3 on Main handles door locks, container ownership and key copies.

export type KeyCopy = { pickUp: string; clickOnto: string; result: string };

/** Picking one item up and clicking it onto another in your own inventory copies a key. */
export const keyCopies: KeyCopy[] = [
  { pickUp: "Clay Ball", clickOnto: "Iron Key or Golden Key", result: "Key Mold. The clay is used up." },
  {
    pickUp: "Copper Ingot",
    clickOnto: "Key Mold",
    result: "Copper Key. It works like the original. The mold is used up.",
  },
  {
    pickUp: "Paper",
    clickOnto: "Iron Key, Golden Key or Copper Key",
    result: "Paper Key. It opens the door once and then falls apart. It can't lock or unlock.",
  },
];

export const locksCommands: WikiCommandSet = {
  system: "Thievery",
  href: "/wiki/locks",
  commands: [
    {
      command: "/thievery clearclues",
      description: "Then right-click one of your doors or containers within 30 seconds to wipe the clues left at it.",
    },
  ],
};

export const locksSection: WikiSection = {
  nav: {
    href: "/wiki/locks",
    label: "Locks & Keys",
    category: "combat",
    blurb: "Lock your doors with a key, choose who can open your chests, and copy keys for friends.",
  },
  commands: locksCommands,
};
