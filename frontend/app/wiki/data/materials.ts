import { T } from "./helpers";
import { collectorHerbMaterials } from "./herb-acquisition";
import type { CatalogMaterial, MaterialAcquisition, WikiSection } from "./types";

// ---------- Materials ----------
//
// Sources, checked against Main on 2026-10-23: `TFMCCore/drops.yml` (profession
// perk drops), `Dowsing/production_methods.yml` (node focuses), the active
// detector list in `geiger_counter/config.yml`, `TrialRooms/loot-tables.yml`,
// `CustomFishing` loot, `Cooking/husbandry.yml` and the MMOItems station
// configs; referral rewards from `activity/referral.yml` (2026-10-24). Drop
// chances stay off the wiki.
//
// Recipes are not written here: every station recipe comes from
// `generated/stationRecipes.ts`, and `catalog.ts` attaches the ones that make
// or use each material.

const ORE_LIST = "iron, gold, diamond, redstone, lapis, emerald or copper ore, deepslate ores included";
const LOG_LIST = "a natural log or wood block of any tree";

const luckyMiner: MaterialAcquisition = {
  method: "Mining with Lucky Miner I",
  detail: `Mine ${ORE_LIST}. You need the Crafter perk Lucky Miner I.`,
};
const treeGatherer = (tier: "I" | "II" | "III" | "IV"): MaterialAcquisition => ({
  method: `Logging with Tree Gatherer ${tier}`,
  detail: `Break ${LOG_LIST}. You need the Herborist perk Tree Gatherer ${tier}. Logs that a player placed give nothing.`,
});
const node = (focus: string, nodeName: string, extra = ""): MaterialAcquisition => ({
  method: `${focus} on a ${nodeName}`,
  detail: `Set a ${nodeName} resource node to the ${focus} focus.${extra}`,
});
const detector: MaterialAcquisition = {
  method: "Arcane Trace Detector",
  detail: "Follow a trace with the detector and dig up what it leads to.",
};
const fishing: MaterialAcquisition = {
  method: "Fishing",
  detail: "Fishing in water can bring it up as treasure.",
};
const trialRooms: MaterialAcquisition = {
  method: "Trial Rooms",
  detail: "Part of the loot in Trial Room chests.",
};
const gradedAnimalProduct = (kind: string, animals: string): MaterialAcquisition[] => [
  {
    method: "Fishing",
    detail: `A better fishing rod brings up better ${kind} with your catch.`,
  },
  {
    method: "Animal Husbandry",
    detail: `Owned ${animals} with good genetics give graded ${kind}. The higher their star tier, the better the grade.`,
  },
];
const forgingUse = (kind: string) => `Used in Forging Station recipes for ${kind}.`;

/** Sources of the current act's materials. Which materials they give changes from act to act. */
const activity: MaterialAcquisition = {
  method: "Weekly activity rewards",
  detail: "Part of the rewards for reaching your weekly activity goals.",
};
const referrals: MaterialAcquisition = {
  method: "Referral rewards",
  detail: "Part of the rewards for inviting a player, or for being invited, as the invited player's playtime grows.",
};
const infestationMonsters: MaterialAcquisition = {
  method: "Infestations",
  detail: "Monsters from an infestation can drop it.",
};
const actFishing = (rod: string): MaterialAcquisition => ({
  method: "Fishing",
  detail: `Fishing in water with ${rod} can bring it up as treasure.`,
});
const laterAct: MaterialAcquisition = {
  method: "A later act",
  detail: "Nobody can find this yet. It becomes available in a later act of the season.",
};

/** Materials made at a station. Their recipes come from the server's station configs. */
export const serverCraftedMaterials: CatalogMaterial[] = [
  {
    name: "Coke",
    group: "Metals and gold",
    texture: T("materials/coke.png"),
    lore: "Purified fuel for smelting Steel.",
  },
  {
    name: "Steel Ingot",
    group: "Metals and gold",
    texture: T("materials/steel_ingot.png"),
    lore: "The step up from iron.",
    usedFor: "Smithing steel weapons and armour at the Forging Station, and building guns and vehicles.",
  },
  {
    name: "Bronze Ingot",
    group: "Metals and gold",
    texture: T("materials/bronze_ingot.png"),
    lore: "An alloy of tin and copper.",
    usedFor: "Smithing at the Forging Station.",
  },
  {
    name: "Abyssalite Ingot",
    group: "Metals and gold",
    texture: T("materials/abyssalite_ingot.png"),
    lore: "The metal after Steel.",
    usedFor: "Smithing abyssalite weapons and armour at the Forging Station, and building guns and vehicles.",
  },
  {
    name: "Mythril Ingot",
    group: "Metals and gold",
    texture: T("materials/mythril_ingot.png"),
    lore: "The finest metal.",
    usedFor: "Smithing mythril weapons and armour at the Forging Station.",
  },
  {
    name: "Barkwood",
    group: "Wood",
    texture: T("materials/barkwood.png"),
    lore: "Bark pressed together with an iron ingot. Refine it before you smith with it.",
  },
  {
    name: "Maplewood",
    group: "Wood",
    texture: T("materials/maplewood.png"),
    lore: "Bark pressed together with a steel ingot. Refine it before you smith with it.",
  },
  {
    name: "Elderwood",
    group: "Wood",
    texture: T("materials/elderwood.png"),
    lore: "Bark pressed together with an abyssalite ingot. Refine it before you smith with it.",
  },
  {
    name: "Demonwood",
    group: "Wood",
    texture: T("materials/demonwood.png"),
    lore: "Bark pressed together with a mythril ingot. Refine it before you smith with it.",
  },
  {
    name: "Refined Barkwood",
    group: "Wood",
    texture: T("materials/refined_barkwood.png"),
    lore: "The first tier of smithing wood.",
    usedFor: forgingUse("bows, shields and other wooden parts"),
  },
  {
    name: "Refined Maplewood",
    group: "Wood",
    texture: T("materials/refined_maplewood.png"),
    lore: "The second tier of smithing wood.",
    usedFor: `${forgingUse("bows, shields and other wooden parts")} Also gun stocks.`,
  },
  {
    name: "Refined Elderwood",
    group: "Wood",
    texture: T("materials/refined_elderwood.png"),
    lore: "The third tier of smithing wood.",
    usedFor: `${forgingUse("bows, shields and other wooden parts")} Also gun stocks.`,
  },
  {
    name: "Refined Demonwood",
    group: "Wood",
    texture: T("materials/refined_demonwood.png"),
    lore: "The fourth and best tier of smithing wood.",
    usedFor: `${forgingUse("bows, shields and other wooden parts")} Also gun stocks.`,
  },
  {
    name: "Alchemy Powder",
    group: "Alchemy and explosives",
    texture: T("materials/alchemy_powder.png"),
    lore: "The base of most alchemy materials.",
  },
  {
    name: "Transmutation Powder",
    group: "Alchemy and explosives",
    texture: T("materials/transmutation_powder.png"),
    lore: "A stronger alchemy base.",
  },
  {
    name: "Carbon Powder",
    group: "Alchemy and explosives",
    texture: T("materials/carbon_powder.png"),
    lore: "One of the three powders that make gunpowder.",
  },
  {
    name: "Synthetic Ink",
    group: "Alchemy and explosives",
    texture: T("materials/synthetic_ink.png"),
    lore: "Alchemical ink.",
  },
  {
    name: "Potash",
    group: "Alchemy and explosives",
    texture: T("materials/potash.png"),
    lore: "A plant salt, the main part of Fertilizer.",
  },
  {
    name: "Fertilizer",
    group: "Alchemy and explosives",
    texture: T("materials/fertilizer.png"),
    lore: "Rich plant food for large farms.",
    usedFor: "Paying for the Advanced Fertilizer upgrade on Farm and Plantation resource nodes.",
  },
  {
    name: "Sulfur",
    group: "Alchemy and explosives",
    texture: T("materials/sulfur.png"),
    lore: "One of the three powders that make gunpowder.",
    acquisition: [{ method: "Creepers", detail: "Creepers sometimes drop it when killed." }],
  },
  {
    name: "Saltpeter",
    group: "Alchemy and explosives",
    texture: T("materials/saltpeter.png"),
    lore: "One of the three powders that make gunpowder.",
  },
  {
    name: "Dynamite",
    group: "Alchemy and explosives",
    texture: T("materials/dynamite.png"),
    lore: "Explosive sticks for mining.",
    usedFor: "Blasting upgrades on mining resource nodes.",
  },
  {
    name: "Detoxed Leather",
    group: "Animal products",
    texture: T("materials/detoxed_leather.png"),
    lore: "Leather treated against disease.",
  },
];

/** Materials that come from gathering, loot or animals rather than a station recipe. */
export const dropOnlyMaterials: CatalogMaterial[] = [
  {
    name: "Ignitium",
    group: "Metals and gold",
    texture: T("materials/ignitium.png"),
    lore: "A fiery crystal, the key to making Coke and Steel.",
    unpackingRecipeKeys: ["gen-ingot-station-ignitium-block2"],
    acquisition: [
      luckyMiner,
      treeGatherer("IV"),
      detector,
      fishing,
      trialRooms,
      activity,
      referrals,
      infestationMonsters,
      {
        method: "Faction battles",
        detail: "Some faction battles reward their fighters with it.",
      },
    ],
    usedFor: "A crystal catalyst at the Forging Station.",
  },
  {
    name: "Tin",
    group: "Metals and gold",
    texture: T("materials/raw_tin.png"),
    lore: "A soft metal, the key to making Bronze.",
    unpackingRecipeKeys: ["gen-ingot-station-tin-block2"],
    acquisition: [
      luckyMiner,
      treeGatherer("IV"),
      detector,
      actFishing("an Abyssalite Rod"),
      activity,
      referrals,
      infestationMonsters,
    ],
    usedFor: "A crystal catalyst at the Forging Station.",
  },
  {
    name: "Abyssalite Fragment",
    group: "Metals and gold",
    texture: T("materials/abyssalite.png"),
    lore: "A tough shard of metal, the raw material of Abyssalite.",
    acquisition: [
      luckyMiner,
      treeGatherer("IV"),
      detector,
      actFishing("an Abyssalite Rod"),
      activity,
      referrals,
      infestationMonsters,
    ],
    usedFor: "A catalyst at the Forging Station.",
  },
  {
    name: "Mythril Fragment",
    group: "Metals and gold",
    texture: T("materials/mythril_fragment.png"),
    lore: "A metal of legend, the raw material of Mythril.",
    acquisition: [laterAct],
    usedFor: "A catalyst at the Forging Station.",
  },
  {
    name: "Mythrilite",
    group: "Metals and gold",
    texture: T("materials/mythrilite.png"),
    lore: "One of the rarest materials in Cerrith. Mythril can't be made without it.",
    acquisition: [laterAct],
  },
  {
    name: "Rough Gold",
    group: "Metals and gold",
    texture: T("materials/rough_gold.png"),
    lore: "The most common grade of goldsmithing gold.",
    acquisition: [
      {
        method: "Mining gold ore",
        detail:
          "Mine gold ore or deepslate gold ore. No perk is needed, but the Crafter perk Gold Digger finds gold far more often.",
      },
      node("Gold Quarry", "Quarry"),
    ],
    usedFor: "Goldsmithing jewellery at a smithing table.",
  },
  {
    name: "Moldable Gold",
    group: "Metals and gold",
    texture: T("materials/moldable_gold.png"),
    lore: "A less common grade of goldsmithing gold.",
    acquisition: [
      {
        method: "Mining gold ore",
        detail:
          "Mine gold ore or deepslate gold ore. No perk is needed, but the Crafter perk Gold Digger finds gold far more often.",
      },
      node("Gold Quarry", "Quarry"),
    ],
    usedFor: "Goldsmithing jewellery at a smithing table.",
  },
  {
    name: "Shiny Gold",
    group: "Metals and gold",
    texture: T("materials/shiny_gold.png"),
    lore: "The rarest grade of goldsmithing gold.",
    acquisition: [
      {
        method: "Mining gold ore",
        detail:
          "Mine gold ore or deepslate gold ore. No perk is needed, but the Crafter perk Gold Digger finds gold far more often.",
      },
      node("Gold Quarry", "Quarry"),
    ],
    usedFor: "Goldsmithing jewellery at a smithing table.",
  },
  {
    name: "Raw Iron Fragment",
    group: "Metals and gold",
    texture: T("materials/rawiron_fragment.png"),
    lore: "A chip of raw iron.",
    acquisition: [{ method: "Fishing", detail: "Fishing with any rod can bring it up." }],
  },
  {
    name: "Raw Gold Fragment",
    group: "Metals and gold",
    texture: T("materials/rawgold_fragment.png"),
    lore: "A chip of raw gold.",
    acquisition: [{ method: "Fishing", detail: "Fishing with any rod can bring it up." }],
  },
  {
    name: "Diamond Fragment",
    group: "Metals and gold",
    texture: T("materials/diamond_fragment.png"),
    lore: "A chip of diamond.",
    acquisition: [{ method: "Fishing", detail: "Fishing with any rod can bring it up." }],
  },
  {
    name: "Bark",
    group: "Wood",
    texture: T("materials/bark.png"),
    lore: "Stripped from trees. Pressed with an ingot, it becomes smithing wood.",
    acquisition: [
      {
        method: "Logging",
        detail: `Break ${LOG_LIST}. No perk is needed. The Herborist perk Tree Gatherer IV gives more.`,
      },
      node("Bark Forestry", "Forestry"),
    ],
  },
  ...(["Valewood", "Runebark", "Amberpine", "Goldmaple", "Silk"] as const).map((name): CatalogMaterial => ({
    name,
    group: "Wood",
    texture: T(`materials/${name.toLowerCase()}.png`),
    lore: "A rare material for carving furniture.",
    acquisition: [
      treeGatherer("III"),
      node("Rare Wood Forestry", "Forestry", " The node needs its Diamond Axes upgrade first."),
    ],
    usedFor: "Carving furniture at a Woodworking Station.",
  })),
  {
    name: "Stone Core",
    group: "Block cores",
    texture: T("mmoitems/stone_core.png"),
    lore: "The essence of stone. The Block Station turns it into stacks of stone blocks.",
    acquisition: [
      {
        method: "Mining stone",
        detail: "Mine stone, andesite, diorite, granite, deepslate or tuff. No perk is needed.",
      },
      luckyMiner,
      node("Stone Quarry", "Quarry"),
    ],
  },
  {
    name: "Wood Core",
    group: "Block cores",
    texture: T("materials/wood_core.png"),
    lore: "The essence of a tree. The Forester Station turns it into stacks of logs and wood blocks.",
    acquisition: [treeGatherer("I"), node("Log Forestry", "Forestry")],
  },
  {
    name: "Flower Core",
    group: "Block cores",
    texture: T("materials/flower_core.png"),
    lore: "The essence of a plant. The Forester Station turns it into flowers, grass, moss and other plants.",
    acquisition: [treeGatherer("II")],
  },
  {
    name: "Niter",
    group: "Alchemy and explosives",
    texture: T("materials/niter.png"),
    lore: "A mineral that burns hot. The base of Dynamite and vehicle munitions.",
    acquisition: [luckyMiner, node("Rare Ore Mine", "Ore Mine")],
  },
  {
    name: "Enchanted Dust",
    group: "Magic",
    texture: T("magic_crafting/enchanted_dust.png"),
    lore: "Magical powder used in mage weapons, runes, charges and many recipes.",
    acquisition: [
      luckyMiner,
      node("Dust Mine", "Magical Mine"),
      {
        method: "Recycling",
        detail: "Runes, artifacts and mage weapons give some Enchanted Dust back at a Recycling Station.",
      },
    ],
  },
  {
    name: "Arcane Crystal",
    group: "Magic",
    texture: T("materials/arcane_crystal.png"),
    lore: "Found deep below the earth, and not of this Plane.",
    acquisition: [luckyMiner, node("Rare Ore Mine", "Ore Mine"), trialRooms],
    usedFor: "Building cars, planes and airships, and upgrading resource nodes.",
  },
  // Every herb an Alchemist Collector can gather on Main.
  ...collectorHerbMaterials,
  ...(
    [
      ["Leather", "Good", "rareleather"],
      ["Leather", "Great", "epicleather"],
      ["Leather", "Perfect", "legendaryleather"],
      ["Feather", "Good", "rarefeather"],
      ["Feather", "Great", "epicfeather"],
      ["Feather", "Perfect", "legendaryfeather"],
      ["Wool", "Good", "rarewool"],
      ["Wool", "Great", "epicwool"],
      ["Wool", "Perfect", "legendarywool"],
    ] as const
  ).map(([kind, grade, file]): CatalogMaterial => ({
    name: `${grade} Quality ${kind}`,
    group: "Animal products",
    texture: T(`pets/${file}.png`),
    lore: `${grade} grade ${kind === "Feather" ? "feathers" : kind.toLowerCase()} for smithing.`,
    acquisition: gradedAnimalProduct(
      kind === "Feather" ? "feathers" : kind.toLowerCase(),
      kind === "Leather"
        ? "cows, horses, donkeys, mules and camels"
        : kind === "Wool"
          ? "sheep and goats"
          : "chickens and llamas",
    ),
    usedFor: forgingUse(
      kind === "Feather"
        ? "light armour, mage armour and bows"
        : kind === "Leather"
          ? "medium armour and weapons"
          : "heavy armour and weapons",
    ),
  })),
  {
    name: "Universal Feed",
    group: "Animal products",
    texture: T("mmoitems/universal_feed.png"),
    lore: "Feed for your animals. Right-click an animal with it to make it happier.",
    acquisition: [
      {
        method: "Made in a Trough",
        detail:
          "Craft a Trough at the Animal Station and place it. Fill its four slots with wheat or vegetables, four of each per slot, then right-click it with an empty hand to take the feed.",
      },
    ],
  },
];

export const materialsSection: WikiSection = {
  nav: {
    href: "/wiki/materials",
    label: "Materials",
    category: "reference",
    blurb: "Every custom crafting material: where to find it and what it makes.",
  },
};
