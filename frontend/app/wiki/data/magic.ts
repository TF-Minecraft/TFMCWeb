import { M, T, V, empty } from "./helpers";
import { stationRecipe } from "./station-recipes";
import type { Recipe, WikiCommandSet, WikiSection } from "./types";

// ---------- Magic (elements, shrines, spell runes, attunement) ----------
//
// Sources: https://github.com/TF-Minecraft/TFMCWeb/blob/main/docs/docs/wiki-research/a-magic-knowledge.md section 1 (live Magic/*.yml,
// MMOItems rune/charge definitions, the jar's plugin.yml). No source repository
// exists for the Magic plugin, so everything here is config-derived.

/** The Magic Station furniture is a plain vanilla 3x3 craft. */
export const magicStationRecipe: Recipe = {
  key: "magic-station",
  title: "Magic Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Gold Ingot", qty: 1, texture: V("gold_ingot.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Amethyst Shard", qty: 1, texture: V("amethyst_shard.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
  ],
  output: {
    name: "Magic Station",
    qty: 1,
    sourceId: "itemsadder:magic_crafting_station",
    model: { url: M("magic-station.json"), texture: T("stations/magic-station.png") },
  },
};

/** ItemsAdder `tfmc:rune_crafting_station`: the Magic Station pattern without the Amethyst Shard. */
export const runeStationRecipe: Recipe = {
  key: "rune-station",
  title: "Rune Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Gold Ingot", qty: 1, texture: V("gold_ingot.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
    empty,
    { name: "Blackstone", qty: 1, texture: V("blackstone.png") },
  ],
  output: {
    name: "Rune Station",
    qty: 1,
    sourceId: "itemsadder:rune_crafting_station",
    model: { url: M("stations/rune-station.json"), textures: { "1": T("stations/rune-station.png") } },
  },
};

/** Everything the Rune Station crafts, from `MMOItems/crafting-stations/rune-station.yml`. Each takes 10 s. */
export const runestoneRecipes: Recipe[] = [
  "minor-runestone",
  "lesser-runestone",
  "greater-runestone",
  "ascendant-runestone",
].map((key) => stationRecipe(`gen-rune-station-${key}`));
// `lesser-armor-` is the recipe key as written in the server config.
export const armorRunestoneRecipes: Recipe[] = [
  "minor-armor-runestone",
  "lesser-armor-",
  "greater-armor-runestone",
  "ascendant-armor-runestone",
].map((key) => stationRecipe(`gen-rune-station-${key}`));
export const enchantedChargeRecipes: Recipe[] = ["minor", "lesser", "greater", "ascendant"].map((key) =>
  stationRecipe(`gen-rune-station-enchanted-charge-${key}`),
);

/**
 * Mage weapon part costs, from the server's Magic `gear/parts.yml`. Parts are not
 * items: the Magic Station's assembly menu charges each chosen part's cost when it
 * builds the weapon, so these cards appear only on the Magic Station page.
 */
const stick = { name: "Stick", texture: T("vanilla/stick.png") };
const book = { name: "Book", texture: T("vanilla/book.png") };
const dust = { name: "Enchanted Dust", texture: T("magic_crafting/enchanted_dust.png") };

function part(
  key: string,
  title: string,
  texture: string,
  ingredients: Array<{ name: string; texture: string; qty: number }>,
): Recipe {
  return {
    key: `magic-part-${key}`,
    title,
    station: "Magic Station",
    category: "Weapon parts",
    ingredients,
    output: { name: title, qty: 1, texture },
  };
}

export const magicPartRecipes: Recipe[] = [
  part("oak-handle", "Oak Magical Handle", T("vanilla/stick.png"), [
    { ...stick, qty: 2 },
    { ...dust, qty: 2 },
  ]),
  part("basic-handle", "Basic Magical Handle", T("magic_crafting/basic_magical_handle.png"), [
    { ...stick, qty: 2 },
    { ...dust, qty: 4 },
  ]),
  part("petty-handle", "Petty Magical Handle", T("magic_crafting/petty_magical_handle.png"), [
    { ...stick, qty: 2 },
    { ...dust, qty: 6 },
  ]),
  part("heavy-handle", "Heavy Magical Handle", T("magic_crafting/heavy_magical_handle.png"), [
    { ...stick, qty: 2 },
    { ...dust, qty: 8 },
  ]),
  part("simple-tome", "Simple Tome", T("vanilla/book.png"), [{ ...book, qty: 2 }]),
  part("simple-magical-tome", "Simple Magical Tome", T("vanilla/book.png"), [
    { ...book, qty: 2 },
    { ...dust, qty: 2 },
  ]),
  part("basic-tome", "Basic Magical Tome", T("magic_crafting/binding_tome.png"), [
    { ...book, qty: 2 },
    { ...dust, qty: 4 },
  ]),
  part("petty-tome", "Petty Magical Tome", T("magic_crafting/binding_tome.png"), [
    { ...book, qty: 2 },
    { ...dust, qty: 6 },
  ]),
  part("heavy-tome", "Heavy Magical Tome", T("magic_crafting/strong_binding_tome.png"), [
    { ...book, qty: 2 },
    { ...dust, qty: 8 },
  ]),
  part("iron-core", "Iron Magical Core", T("magic_crafting/makeshift_magical_core.png"), [
    { name: "Iron Ingot", qty: 4, texture: T("vanilla/iron_ingot.png") },
    { ...dust, qty: 4 },
  ]),
  part("steel-core", "Steel Magical Core", T("magic_crafting/basic_magical_core.png"), [
    { name: "Steel Ingot", qty: 4, texture: T("materials/steel_ingot.png") },
    { ...dust, qty: 4 },
  ]),
  part("abyssalite-core", "Abyssalite Magical Core", T("magic_crafting/petty_magical_core.png"), [
    { name: "Abyssalite Ingot", qty: 4, texture: T("materials/abyssalite_ingot.png") },
    { ...dust, qty: 4 },
  ]),
  part("mythril-core", "Mythril Magical Core", T("magic_crafting/heavy_magical_core.png"), [
    { name: "Mythril Ingot", qty: 4, texture: T("materials/mythril_ingot.png") },
    { ...dust, qty: 4 },
  ]),
];

export const magicRecipes: Recipe[] = [magicStationRecipe, runeStationRecipe, ...magicPartRecipes];

// ---------- Commands ----------

export const magicCommands: WikiCommandSet = {
  system: "Magic",
  href: "/wiki/magic",
  commands: [
    {
      command: "/magic rune keybind <right_click|left_click|shift_right_click|shift_left_click>",
      description: "Changes which click casts the spells of the rune in your main hand.",
    },
    {
      command: "/resonance",
      aliases: ["/res"],
      description:
        "Opens your Resonance profile: a bar per element, your Equilibrium (Corruption vs Tranquility), your Mental Points, and the Surge / Flow cast-mode toggle.",
      notes: "Requires an active character.",
    },
  ],
};

export const magicSection: WikiSection = {
  nav: {
    href: "/wiki/magic",
    label: "Magic",
    category: "magic",
    blurb: "Build a mage weapon, fill charges at a shrine and meditate to raise your Resonance.",
  },
  recipes: magicRecipes,
  commands: magicCommands,
};
