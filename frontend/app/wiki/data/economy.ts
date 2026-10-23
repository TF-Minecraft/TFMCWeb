import type { WikiCommandSet, WikiSection } from "./types";

// ---------- Denar Economy ----------

export type DenarCoin = {
  item: string;
  displayName: string;
  value: number;
  withdrawable: boolean;
};

/** `coins.yml`: every physical coin item and its value in denars. */
export const denarCoins: DenarCoin[] = [
  { item: "Pouch of Gold Denars", displayName: "Pouch of Gold Denars", value: 100, withdrawable: true },
  { item: "Stack of Gold Denars", displayName: "Stack of Gold Denars", value: 10, withdrawable: true },
  { item: "Handful of Gold Denars", displayName: "Handful of Gold Denars", value: 5, withdrawable: true },
  { item: "Gold Denar", displayName: "Gold Denar", value: 1, withdrawable: true },
  { item: "Stack of Silver Denars", displayName: "Stack of Silver Denars", value: 0.1, withdrawable: true },
  { item: "Handful of Silver Denars", displayName: "Handful of Silver Denars", value: 0.05, withdrawable: true },
  { item: "Silver Denar", displayName: "Silver Denar", value: 0.01, withdrawable: true },
  { item: "Gold Ingot", displayName: "Gold Ingot (vanilla)", value: 1, withdrawable: false },
];

/**
 * DenarEconomy 0.1.8 ships with no admin command and no permission node at all :
 * every `/deco` and `/pouch` subcommand is open to every player, and balance
 * manipulation by other plugins goes through the API, not a console command.
 */
export const denarCommands: WikiCommandSet = {
  system: "Denar Economy",
  href: "/wiki/economy",
  commands: [
    {
      command: "/pouch",
      description: "Shows a floating hologram of your pouch balance above your head for 5 seconds.",
      notes: "5-second cooldown between uses.",
    },
    {
      command: "/deco bal",
      description: "Prints both your pouch balance and your bank balance in chat.",
    },
    {
      command: "/deco pay <amount>",
      description: "Drops that amount out of your pouch as physical coin items for someone else to pick up.",
      notes: "Drops the coins at your feet. It does not send them straight to a player.",
    },
    {
      command: "/deco toitem <amount>",
      description:
        "Converts part of your pouch balance into physical coin items in your inventory, largest denomination first.",
      notes:
        "Add a coin name, as in /deco toitem <count> <coin>, to take that many of one coin. Gold Ingots can never be withdrawn this way.",
    },
    {
      command: "/deco topouch",
      description: "Puts the coins in your main hand back into your pouch.",
      notes: "Coins dropped in the world or on death can't go back into a pouch.",
    },
    {
      command: "/deco deposit <amount>",
      description: "Moves denars from your pouch into your bank.",
      notes: "You must be in a faction or guild and standing in its bank chunk.",
    },
    {
      command: "/deco withdraw <amount>",
      description: "Moves denars from your bank into your pouch.",
      notes: "You must be in a faction or guild and standing in its bank chunk.",
    },
    {
      command: "/deco baltop",
      description: "Prints a leaderboard of the richest characters, pouch and bank together.",
    },
    {
      command: "/deco history",
      description: "Lists the recent changes to your current character's pouch and bank.",
    },
  ],
};

export const economySection: WikiSection = {
  nav: {
    href: "/wiki/economy",
    label: "Denar Economy",
    category: "social",
    blurb: "How denars work: your pouch, faction banks, coins, and what you lose when you die.",
  },
  commands: denarCommands,
};
