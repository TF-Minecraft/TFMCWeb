import type { CommandRow, WikiCommandSet, WikiSection } from "./types";

// ---------- Thievery ----------
//
// Sourced from https://github.com/TF-Minecraft/TFMCWeb/blob/main/docs/docs/wiki-research/e-adventure.md, "Thievery" section.
// Jar: thievery-1.0.0.jar. No `permissions:` block exists in plugin.yml, so
// every command below is open to a normal player except where noted.

export type ThieveryKeyCopy = { pickUp: string; clickOnto: string; result: string; message: string };

/** Dragging one item onto another in your own inventory copies a key. */
export const thieveryKeyCopies: ThieveryKeyCopy[] = [
  { pickUp: "Clay Ball", clickOnto: "a master key", result: "Key Mold", message: "Key mold created." },
  { pickUp: "Copper Ingot", clickOnto: "a key mold", result: "Copper Key (permanent)", message: "Key copy created." },
  {
    pickUp: "Paper",
    clickOnto: "a master key or copper copy",
    result: "Paper Key (single-use, doors only)",
    message: "Paper key created.",
  },
];

export const thieveryCommands: CommandRow[] = [
  {
    command: "/thievery",
    description: "Lists the thievery commands.",
  },
  {
    command: "/thievery loadout",
    description: "Chooses what you can steal.",
    notes: 'Needs the "thief" character trait.',
  },
  {
    command: "/thievery clearclues",
    description: "Wipes the clues from a door or container: run it, then right-click the block.",
    notes: "Only on doors and containers you can open through their lock. Unlocked ones are open to anyone.",
  },
  { command: "/pickpocket", description: "Shows pickpocket usage." },
  {
    command: "/pickpocket start",
    description: "Starts a pickpocket: run it, then right-click a player within 4 blocks.",
    notes: 'Requires the "thief" trait.',
  },
  { command: "/robbery", description: "Shows robbery usage." },
  {
    command: "/robbery start",
    description: "Starts a robbery: run it, then right-click a player within 4 blocks.",
    notes: 'Requires the "bandit" trait.',
  },
  {
    command: "/robbery accept",
    description: "Accepts a robbery demand aimed at you.",
    notes: "Anyone can accept.",
  },
  {
    command: "/handsup",
    description: "Raises your hands so other players can right-click you to look through your inventory.",
    notes: "They can look but not take anything. Sneak or use /handsup again to stop.",
  },
];

/**
 * Every player command Thievery registers, per its plugin.yml (no
 * `permissions:` block exists, so everything below is open to a normal
 * player at the command level: several subcommands additionally require a
 * character trait, noted per row).
 */
export const thieveryCommandSet: WikiCommandSet = {
  system: "Thievery",
  href: "/wiki/thievery",
  commands: thieveryCommands,
};

export const thieverySection: WikiSection = {
  nav: {
    href: "/wiki/thievery",
    label: "Thievery",
    category: "combat",
    blurb:
      "Lock your doors and chests, or break into someone else's: lockpicking, pickpocketing, and consensual robbery.",
  },
  commands: thieveryCommandSet,
};
