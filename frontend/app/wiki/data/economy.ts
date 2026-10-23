import { empty, V } from "./helpers";
import type { Recipe, WikiCommandSet, WikiSection } from "./types";

// ---------- Money ----------

export type DenarCoin = { name: string; value: string; image: string };

/** Main's `DenarEconomy/coins.yml`: every coin item and its value in denars. */
export const denarCoins: DenarCoin[] = [
  { name: "Pouch of Gold Denars", value: "100 d", image: "pouch-of-gold-denars" },
  { name: "Stack of Gold Denars", value: "10 d", image: "stack-of-gold-denars" },
  { name: "Handful of Gold Denars", value: "5 d", image: "handful-of-gold-denars" },
  { name: "Gold Denar", value: "1 d", image: "gold-denar" },
  { name: "Stack of Silver Denars", value: "0.10 d", image: "stack-of-silver-denars" },
  { name: "Handful of Silver Denars", value: "0.05 d", image: "handful-of-silver-denars" },
  { name: "Silver Denar", value: "0.01 d", image: "silver-denar" },
].map((coin) => ({ ...coin, image: `/wiki/textures/currency/${coin.image}.png` }));

/** DenarEconomy 0.7.1. `give`, `reload`, `legacy`, `account`, `move` and `history <player>` are staff only. */
export const denarCommands: WikiCommandSet = {
  system: "Money",
  href: "/wiki/economy",
  commands: [
    {
      command: "/deco bal",
      description: "Shows your pouch and bank balances.",
    },
    {
      command: "/pouch",
      description: "Shows how much money you carry, coins included, above your head for 5 seconds.",
      notes: "Players near you can read it too.",
    },
    {
      command: "/deco toitem <amount> [coin]",
      description: "Turns pouch money into coins in your inventory. Name a coin to get only that kind.",
    },
    {
      command: "/deco topouch",
      description: "Puts the coins in your hand into your pouch.",
    },
    {
      command: "/deco pay <amount>",
      description: "Drops that much from your pouch at your feet as coins, for someone to pick up.",
    },
    {
      command: "/deco deposit <amount>",
      description: "Moves money from your pouch into your bank.",
      notes: "Only at your faction's or guild's bank.",
    },
    {
      command: "/deco withdraw <amount>",
      description: "Moves money from your bank into your pouch.",
      notes: "Only at your faction's or guild's bank.",
    },
    {
      command: "/deco history",
      description: "Lists your last 20 payments in and out.",
    },
    {
      command: "/deco baltop",
      description: "Lists the 20 richest characters.",
    },
  ],
};

// ---------- Market Block ----------

export const marketBlockRecipe: Recipe = {
  key: "market-block",
  title: "Market Block",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Ink Sac", qty: 1, texture: V("ink_sac.png") },
    { name: "Paper", qty: 1, texture: V("paper.png") },
    empty,
    { name: "Oak Planks", qty: 1, texture: V("oak_planks.png") },
    { name: "Oak Planks", qty: 1, texture: V("oak_planks.png") },
    { name: "Oak Planks", qty: 1, texture: V("oak_planks.png") },
    { name: "Oak Planks", qty: 1, texture: V("oak_planks.png") },
    empty,
    { name: "Oak Planks", qty: 1, texture: V("oak_planks.png") },
  ],
  note: "Synthetic Ink can replace the Ink Sac. Use one Oak Plank in each of the five plank slots.",
  output: {
    name: "Market Block",
    qty: 1,
    model: {
      url: "/wiki/models/market-block.json",
      textures: {
        "4": "/wiki/textures/market-block/wood_m.png",
        "8": "/wiki/textures/market-block/wood2.png",
        "9": "/wiki/textures/market-block/wood1.png",
        "10": "/wiki/textures/market-block/coin.png",
        "11": "/wiki/textures/market-block/manifest.png",
        "12": "/wiki/textures/market-block/ink_bottle.png",
        "13": "/wiki/textures/market-block/apple.png",
      },
    },
  },
};

export type MarketGood = { category: string; goods: string; bundle: number; price: string };

/**
 * Main's `MarketBlock/trades.yml` (MarketBlock 0.2.1): what the market buys, the bundle it takes
 * and its resting price. MarketBlock has no player command; `/marketblock` is staff only.
 */
export const marketGoods: MarketGood[] = [
  { category: "Metal", goods: "Iron Ingot", bundle: 64, price: "4 d" },
  { category: "Metal", goods: "Copper Ingot", bundle: 64, price: "2 d" },
  { category: "Mineral", goods: "Enchanted Dust", bundle: 16, price: "4 d" },
  { category: "Mineral", goods: "Arcane Crystal, Niter", bundle: 16, price: "3 d" },
  { category: "Mineral", goods: "Diamond, Emerald", bundle: 16, price: "2 d" },
  { category: "Mineral", goods: "Coal, Lapis Lazuli, Redstone", bundle: 64, price: "0.50 d" },
  { category: "Stone", goods: "Stone, Andesite, Diorite, Granite, Deepslate, Tuff", bundle: 64, price: "0.50 d" },
  { category: "Wood", goods: "Bark", bundle: 64, price: "2 d" },
  { category: "Wood", goods: "Valewood, Runebark, Amberpine, Goldmaple", bundle: 16, price: "2 d" },
  {
    category: "Wood",
    goods: "Oak, spruce, birch, jungle, acacia, dark oak, mangrove, cherry or pale oak logs",
    bundle: 64,
    price: "0.50 d",
  },
  { category: "Farm", goods: "Silk, Tobacco", bundle: 16, price: "2 d" },
  { category: "Farm", goods: "Salt", bundle: 32, price: "2 d" },
  { category: "Farm", goods: "Raw beef, chicken, mutton, pork, rabbit", bundle: 16, price: "1 d" },
  { category: "Farm", goods: "Wheat, Beetroot, Pumpkin, Sugar Cane, Honey Bottle", bundle: 64, price: "1 d" },
  { category: "Farm", goods: "Carrot, Potato, Melon Slice", bundle: 64, price: "0.50 d" },
  { category: "Fish", goods: "Cod, Salmon, Tropical Fish, Pufferfish", bundle: 64, price: "1 d" },
  { category: "Alchemy", goods: "Gunpowder", bundle: 16, price: "4 d" },
  { category: "Alchemy", goods: "Nether Wart", bundle: 64, price: "0.50 d" },
];

export const economySection: WikiSection = {
  nav: {
    href: "/wiki/economy",
    label: "Money & Market Blocks",
    category: "social",
    blurb: "Denars: your pouch and bank, coins, earning money and selling goods at Market Blocks.",
  },
  recipes: [marketBlockRecipe],
  commands: denarCommands,
};
