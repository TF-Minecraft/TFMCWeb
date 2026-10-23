import type { WikiCommandSet, WikiSection } from "./types";

// Thievery 1.8.3 on Main. Its plugin.yml has no permission nodes for these
// commands; the character archetype each one needs is noted per row. Locks,
// keys and /thievery clearclues are documented on Locks & Keys (locks.ts).

export const thieveryCommandSet: WikiCommandSet = {
  system: "Thievery",
  href: "/wiki/thievery",
  commands: [
    {
      command: "/thievery loadout",
      description: "Choose which kinds of items you can see and take. Thief only.",
    },
    {
      command: "/pickpocket start",
      description: "Then right-click a player within 4 blocks to pick their pocket. Thief only.",
    },
    {
      command: "/robbery start",
      description: "Then right-click a player within 4 blocks to demand a robbery. Bandit only.",
    },
    {
      command: "/robbery accept",
      description: "Accepts a robbery demanded of you. Anyone can use it.",
    },
  ],
};

export const thieverySection: WikiSection = {
  nav: {
    href: "/wiki/thievery",
    label: "Thievery",
    category: "combat",
    blurb: "Thieves and bandits: picking locks and pockets, robbing players and looting graves.",
  },
  commands: thieveryCommandSet,
};
