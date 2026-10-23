import { M, T, V, empty } from "./helpers";
import { stationRecipe } from "./station-recipes";
import type { Recipe, WikiCommandSet, WikiSection } from "./types";

// ---------- Magic and mage weapons ----------
//
// Sources: the Magic plugin (TF-Minecraft/Magic, v0.12.2 on Main) and Main's live
// `plugins/Magic` configs, MMOItems rune and mage gear items, and the ItemsAdder
// station recipes. Hidden values (orb counts, Rift per orb, gains per hit, odds)
// are deliberately left off the player pages.

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
  note: "Place it, then right-click it to open the weapon assembly menu.",
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
  note: "Place it, then right-click it to make runestones and Enchanted Charges from Enchanted Dust.",
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

export const magicRecipes: Recipe[] = [magicStationRecipe, runeStationRecipe];

// ---------- Commands ----------

export const magicCommands: WikiCommandSet = {
  system: "Magic",
  href: "/wiki/magic",
  commands: [
    {
      command: "/resonance",
      aliases: ["/res"],
      description:
        "Opens your Resonance screen: your Resonance in each school, your Equilibrium, your Mental Points and the Surge or Flow choice.",
      notes: "Needs an active character.",
    },
  ],
};

export const mageWeaponCommands: WikiCommandSet = {
  system: "Magic",
  href: "/wiki/mage-weapons",
  commands: [
    {
      command: "/magic rune keybind <key>",
      description:
        "While holding a spell rune, changes the key that casts it: RIGHT_CLICK, LEFT_CLICK, SHIFT_RIGHT_CLICK or SHIFT_LEFT_CLICK.",
    },
  ],
};

export const magicSection: WikiSection = {
  nav: {
    href: "/wiki/magic",
    label: "Magic",
    category: "magic",
    blurb: "The four schools, Resonance, shrines, artifacts and meditation.",
  },
  commands: magicCommands,
};

export const mageWeaponsSection: WikiSection = {
  nav: {
    href: "/wiki/mage-weapons",
    label: "Mage Weapons",
    category: "magic",
    blurb: "Build a staff, wand or blade, attune it with a charge, and fit spell runes.",
  },
  recipes: magicRecipes,
  commands: mageWeaponCommands,
};
