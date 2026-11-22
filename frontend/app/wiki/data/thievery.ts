import type { WikiCommandSet, WikiSection } from "./types";

// Thievery 1.10.0 on Main. Its plugin.yml has no permission nodes for these
// commands; the character archetype each one needs is noted per row. Locks,
// keys and /thievery clearclues are documented on Locks & Keys (locks.ts).

export const thieveryCommandSet: WikiCommandSet = {
  system: "Thievery",
  href: "/wiki/thievery",
  commands: [
    {
      command: "/thievery loadout",
      description: "Opens the menu where you choose which kinds of items you can see and take. Thief or Bandit only.",
    },
    {
      command: "/pickpocket start",
      description: "Run it, then right-click a player within 4 blocks to pick their pocket. Thief only.",
    },
    {
      command: "/robbery start",
      description: "Run it, then right-click a player within 4 blocks to demand a robbery. Bandit only.",
    },
    {
      command: "/robbery accept",
      description: "Agrees to a robbery someone has demanded of you. Anyone can use it.",
    },
  ],
};

export const thieverySection: WikiSection = {
  nav: {
    href: "/wiki/thievery",
    label: "Thievery",
    category: "combat",
    blurb: "Thieves and Bandits: picking locks and pockets, robbing players and looting graves.",
  },
  commands: thieveryCommandSet,
};
