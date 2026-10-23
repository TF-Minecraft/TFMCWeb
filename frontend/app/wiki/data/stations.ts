import { M, T, V, empty } from "./helpers";
import { alloyForgeRecipe, ingredientConverterRecipe, weaponStationRecipe } from "./advanced-crafting";
import { archeologyTableRecipe } from "./archaeology";
import { magicStationRecipe, runeStationRecipe } from "./magic";
import { recyclingStationRecipe } from "./recycler";
import { stationRecipes } from "./station-recipes";
import { constructionStations } from "./vehicle-construction";
import type { Recipe, StationInfo, WikiSection } from "./types";

// ---------- Stations ----------

const vehicleStationTexture = (station: string, file: string) => T(`vehicle-stations/${station}/${file}.png`);
const engineerModel = {
  url: M("vehicles/ammunition_station.json"),
  textures: {
    "0": vehicleStationTexture("ammunition_station", "bullet"),
    "1": vehicleStationTexture("ammunition_station", "pin"),
    "2": vehicleStationTexture("ammunition_station", "stand"),
    "3": vehicleStationTexture("ammunition_station", "bag"),
    "4": vehicleStationTexture("ammunition_station", "wood4"),
    "5": vehicleStationTexture("ammunition_station", "powder"),
    "6": vehicleStationTexture("ammunition_station", "bullet2"),
    "8": vehicleStationTexture("ammunition_station", "wood2"),
    "9": vehicleStationTexture("ammunition_station", "wood1"),
    particle: vehicleStationTexture("ammunition_station", "bullet"),
  },
};
const animalModel = { url: M("animal-station.json"), texture: T("stations/animal-station.png") };
const medicineModel = { url: M("medicine-station.json"), texture: T("stations/medicine-station.png") };
const birdMailboxModel = { url: M("bird-mailbox.json"), texture: T("bird-mail/mailbox.png") };
const magicModel = { url: M("magic-station.json"), texture: T("stations/magic-station.png") };
const weaponModel = { url: M("weapon-station.json"), texture: T("stations/weapon-station.png") };
const converterModel = { url: M("ingredient-converter.json"), texture: T("stations/ingredient-converter.png") };
const alloyModel = {
  url: M("alloy-forge.json"),
  texture: T("stations/alloy-forge.png"),
  textureAnimationUrl: T("stations/alloy-forge.png.mcmeta"),
};
const recyclingModel = { url: M("recycling-station.json"), texture: T("stations/recycling-station.png") };
const dockyardModel = {
  url: M("vehicles/dockyard.json"),
  textures: {
    bottom: vehicleStationTexture("dockyard", "bottom"),
    side: vehicleStationTexture("dockyard", "side"),
    front: vehicleStationTexture("dockyard", "front"),
    top: vehicleStationTexture("dockyard", "top"),
    particle: vehicleStationTexture("dockyard", "side"),
  },
};
const fishingStationModel = {
  url: M("stations/fishing-station.json"),
  textures: {
    "2": T("stations/fishing-station/fishing-station.png"),
  },
};
const gunsmithingStationModel = {
  url: M("stations/gunsmithing-station.json"),
  textures: {
    "4": T("stations/gunsmithing-station/wood_m.png"),
    "8": T("stations/gunsmithing-station/wood2.png"),
    "9": T("stations/gunsmithing-station/wood1.png"),
    "11": T("stations/gunsmithing-station/manifest.png"),
    "14": T("stations/gunsmithing-station/pistol.png"),
    particle: T("stations/gunsmithing-station/bullet.png"),
  },
};
const mealPrepStationModel = {
  url: M("stations/meal-prep-station.json"),
  textures: {
    "0": T("stations/meal-prep-station/meal-prep-station.png"),
    particle: T("stations/meal-prep-station/meal-prep-station.png"),
  },
};
const brewingStandModel = {
  url: M("vanilla/brewing_stand.json"),
  textures: {
    base: V("brewing_stand_base.png"),
    stand: V("brewing_stand_model.png"),
  },
};
const stonecutterModel = {
  url: M("vanilla/stonecutter.json"),
  textures: {
    bottom: V("stonecutter_bottom.png"),
    top: V("stonecutter_top.png"),
    side: V("stonecutter_side.png"),
    saw: V("stonecutter_saw.png"),
  },
};
const grindstoneModel = {
  url: M("vanilla/grindstone.json"),
  textures: {
    pivot: V("grindstone_pivot.png"),
    round: V("grindstone_round.png"),
    side: V("grindstone_side.png"),
    leg: V("dark_oak_log.png"),
  },
};

const vanillaSlot = (name: string, id: string, texture: string) => ({
  name,
  qty: 1,
  sourceId: `vanilla:${id}`,
  texture: V(texture),
});

const vanillaStationRecipes = {
  brewingStand: {
    key: "vanilla-brewing-stand",
    title: "Brewing Stand",
    station: "Crafting Table",
    ingredients: [
      empty,
      vanillaSlot("Blaze Rod", "blaze_rod", "blaze_rod.png"),
      empty,
      vanillaSlot("Stone Crafting Material", "#stone_crafting_materials", "cobblestone.png"),
      vanillaSlot("Stone Crafting Material", "#stone_crafting_materials", "cobblestone.png"),
      vanillaSlot("Stone Crafting Material", "#stone_crafting_materials", "cobblestone.png"),
      empty,
      empty,
      empty,
    ],
    output: vanillaSlot("Brewing Stand", "brewing_stand", "brewing_stand.png"),
  },
  stonecutter: {
    key: "vanilla-stonecutter",
    title: "Stonecutter",
    station: "Crafting Table",
    ingredients: [
      empty,
      vanillaSlot("Iron Ingot", "iron_ingot", "iron_ingot.png"),
      empty,
      vanillaSlot("Stone", "stone", "stone.png"),
      vanillaSlot("Stone", "stone", "stone.png"),
      vanillaSlot("Stone", "stone", "stone.png"),
      empty,
      empty,
      empty,
    ],
    output: vanillaSlot("Stonecutter", "stonecutter", "stonecutter_top.png"),
  },
  grindstone: {
    key: "vanilla-grindstone",
    title: "Grindstone",
    station: "Crafting Table",
    ingredients: [
      vanillaSlot("Stick", "stick", "stick.png"),
      vanillaSlot("Stone Slab", "stone_slab", "stone.png"),
      vanillaSlot("Stick", "stick", "stick.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
      empty,
      empty,
    ],
    output: vanillaSlot("Grindstone", "grindstone", "grindstone_side.png"),
  },
  fletchingTable: {
    key: "vanilla-fletching-table",
    title: "Fletching Table",
    station: "Crafting Table",
    ingredients: [
      vanillaSlot("Flint", "flint", "flint.png"),
      vanillaSlot("Flint", "flint", "flint.png"),
      empty,
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
    ],
    output: vanillaSlot("Fletching Table", "fletching_table", "fletching_table_front.png"),
  },
  blastFurnace: {
    key: "vanilla-blast-furnace",
    title: "Blast Furnace",
    station: "Crafting Table",
    ingredients: [
      vanillaSlot("Iron Ingot", "iron_ingot", "iron_ingot.png"),
      vanillaSlot("Iron Ingot", "iron_ingot", "iron_ingot.png"),
      vanillaSlot("Iron Ingot", "iron_ingot", "iron_ingot.png"),
      vanillaSlot("Iron Ingot", "iron_ingot", "iron_ingot.png"),
      vanillaSlot("Furnace", "furnace", "furnace.png"),
      vanillaSlot("Iron Ingot", "iron_ingot", "iron_ingot.png"),
      vanillaSlot("Smooth Stone", "smooth_stone", "smooth_stone.png"),
      vanillaSlot("Smooth Stone", "smooth_stone", "smooth_stone.png"),
      vanillaSlot("Smooth Stone", "smooth_stone", "smooth_stone.png"),
    ],
    output: vanillaSlot("Blast Furnace", "blast_furnace", "blast_furnace_front.png"),
  },
  jukebox: {
    key: "vanilla-jukebox",
    title: "Jukebox",
    station: "Crafting Table",
    ingredients: [
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Diamond", "diamond", "diamond.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
    ],
    output: vanillaSlot("Jukebox", "jukebox", "jukebox_top.png"),
  },
  cartographyTable: {
    key: "vanilla-cartography-table",
    title: "Cartography Table",
    station: "Crafting Table",
    ingredients: [
      vanillaSlot("Paper", "paper", "paper.png"),
      vanillaSlot("Paper", "paper", "paper.png"),
      empty,
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
    ],
    output: vanillaSlot("Cartography Table", "cartography_table", "cartography_table_top.png"),
  },
  craftingTable: {
    key: "vanilla-crafting-table",
    title: "Crafting Table",
    station: "Player Crafting",
    ingredients: [
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      vanillaSlot("Wooden Planks", "#planks", "oak_planks.png"),
      empty,
      empty,
      empty,
      empty,
    ],
    output: vanillaSlot("Crafting Table", "crafting_table", "crafting_table_top.png"),
  },
} satisfies Record<string, Recipe>;

const medicineStationCraft: Recipe = {
  key: "craft-medicine-station",
  title: "Medicine Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    empty,
    { name: "Diamond", qty: 1, texture: V("diamond.png") },
    empty,
    empty,
    { name: "Diamond", qty: 1, texture: V("diamond.png") },
    empty,
    { name: "Stone", qty: 1, texture: V("stone.png") },
    { name: "Stone", qty: 1, texture: V("stone.png") },
    { name: "Stone", qty: 1, texture: V("stone.png") },
  ],
  output: { name: "Medicine Station", qty: 1, sourceId: "itemsadder:medicine_station", model: medicineModel },
};

const birdMailboxCraft: Recipe = {
  key: "craft-bird-mailbox",
  title: "Bird Mailbox",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    empty,
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    empty,
    empty,
    { name: "Stick", qty: 1, sourceId: "vanilla:stick", texture: V("stick.png") },
    empty,
    { name: "Stick", qty: 1, sourceId: "vanilla:stick", texture: V("stick.png") },
    { name: "Stick", qty: 1, sourceId: "vanilla:stick", texture: V("stick.png") },
    { name: "Stick", qty: 1, sourceId: "vanilla:stick", texture: V("stick.png") },
  ],
  output: { name: "Bird Mailbox", qty: 1, sourceId: "itemsadder:bird_coop", model: birdMailboxModel },
};

const engineerStationCraft: Recipe = {
  key: "craft-engineer-station",
  title: "Engineer Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Copper Ingot", qty: 1, sourceId: "vanilla:copper_ingot", texture: V("copper_ingot.png") },
    { name: "Copper Ingot", qty: 1, sourceId: "vanilla:copper_ingot", texture: V("copper_ingot.png") },
    { name: "Copper Ingot", qty: 1, sourceId: "vanilla:copper_ingot", texture: V("copper_ingot.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    empty,
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    empty,
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
  ],
  output: { name: "Engineer Station", qty: 1, sourceId: "itemsadder:ammunition_station", model: engineerModel },
};

const gunsmithingStationCraft: Recipe = {
  key: "craft-gunsmithing-station",
  title: "Gunsmithing Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Copper Ingot", qty: 1, sourceId: "vanilla:copper_ingot", texture: V("copper_ingot.png") },
    { name: "Iron Ingot", qty: 1, sourceId: "vanilla:iron_ingot", texture: V("iron_ingot.png") },
    { name: "Copper Ingot", qty: 1, sourceId: "vanilla:copper_ingot", texture: V("copper_ingot.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    empty,
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    empty,
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
  ],
  output: {
    name: "Gunsmithing Station",
    qty: 1,
    sourceId: "itemsadder:gunsmithing_station",
    model: gunsmithingStationModel,
  },
};

const mealPrepStationCraft: Recipe = {
  key: "craft-meal-prep-station",
  title: "Meal Prep Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
    { name: "Bricks", qty: 1, sourceId: "vanilla:bricks", texture: V("bricks.png") },
  ],
  output: { name: "Meal Prep Station", qty: 1, sourceId: "itemsadder:meal_prep_station", model: mealPrepStationModel },
};

const fishingStationCraft: Recipe = {
  key: "craft-fishing-station",
  title: "Fishing Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "String", qty: 1, sourceId: "vanilla:string", texture: V("string.png") },
    { name: "String", qty: 1, sourceId: "vanilla:string", texture: V("string.png") },
    { name: "String", qty: 1, sourceId: "vanilla:string", texture: V("string.png") },
    { name: "Mossy Cobblestone", qty: 1, sourceId: "vanilla:mossy_cobblestone", texture: V("mossy_cobblestone.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    { name: "Mossy Cobblestone", qty: 1, sourceId: "vanilla:mossy_cobblestone", texture: V("mossy_cobblestone.png") },
    { name: "Mossy Cobblestone", qty: 1, sourceId: "vanilla:mossy_cobblestone", texture: V("mossy_cobblestone.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    { name: "Mossy Cobblestone", qty: 1, sourceId: "vanilla:mossy_cobblestone", texture: V("mossy_cobblestone.png") },
  ],
  output: { name: "Fishing Station", qty: 1, sourceId: "itemsadder:fishing_station", model: fishingStationModel },
};

const animalStationCraft: Recipe = {
  key: "craft-animal-station",
  title: "Animal Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
    { name: "Oak Log", qty: 1, sourceId: "vanilla:oak_log", texture: V("oak_log.png") },
  ],
  output: { name: "Animal Station", qty: 1, sourceId: "itemsadder:animal_station", model: animalModel },
};

const woodworkingModel = { url: M("woodworking-station.json"), texture: T("stations/woodworking-station.png") };
const oakPlanks = { name: "Oak Planks", qty: 1, sourceId: "vanilla:oak_planks", texture: V("oak_planks.png") };

const woodworkingStationCraft: Recipe = {
  key: "craft-woodworking-station",
  title: "Woodworking Station",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [oakPlanks, oakPlanks, oakPlanks, oakPlanks, empty, oakPlanks, oakPlanks, empty, oakPlanks],
  output: {
    name: "Woodworking Station",
    qty: 1,
    sourceId: "itemsadder:woodworking_station",
    model: woodworkingModel,
  },
};

const stationOwnedCraftRecipes = [
  engineerStationCraft,
  gunsmithingStationCraft,
  mealPrepStationCraft,
  medicineStationCraft,
  fishingStationCraft,
  animalStationCraft,
  birdMailboxCraft,
  woodworkingStationCraft,
];

const [engineeringTableCraft, dockyardCraft] = constructionStations;

export const stations: StationInfo[] = [
  // Smithing and tools
  {
    slug: "weapon-station",
    name: "Forging Station",
    group: "Smithing and tools",
    blurb: "Smith weapons, armour and bows from metal and wood ingredients.",
    icon: T("stations/weapon-station.png"),
    interaction: "Right click",
    guide: { href: "/wiki/advanced-crafting", label: "Advanced Crafting guide" },
    model: weaponModel,
    craftRecipe: weaponStationRecipe,
  },
  {
    slug: "ingredient-converter",
    name: "Ingredient Converter",
    group: "Smithing and tools",
    blurb: "Turns metals and woods into smithing ingredients and shows the stats they give.",
    usage: "Hold the material in your hand when you click.",
    icon: T("stations/ingredient-converter.png"),
    interaction: "Right click",
    guide: { href: "/wiki/advanced-crafting", label: "Advanced Crafting guide" },
    model: converterModel,
    craftRecipe: ingredientConverterRecipe,
  },
  {
    slug: "alloy-forge",
    name: "Alloy Forge",
    group: "Smithing and tools",
    blurb: "Melts metals and catalysts together into named alloys.",
    icon: T("stations/alloy-forge.png"),
    interaction: "Right click",
    guide: { href: "/wiki/advanced-crafting", label: "Advanced Crafting guide" },
    model: alloyModel,
    craftRecipe: alloyForgeRecipe,
  },
  {
    slug: "ingot-station",
    name: "Ingot Station",
    group: "Smithing and tools",
    blurb: "Smelts ingots and Coke, makes the smithing woods and gemstones, and packs materials into storage blocks.",
    icon: V("blast_furnace_front.png"),
    interaction: "Shift + Right click",
    fallbackTexture: V("blast_furnace_front.png"),
    vanillaBlock: {
      name: "Blast Furnace",
      recipe: vanillaStationRecipes.blastFurnace,
    },
    cubeFaces: {
      up: V("blast_furnace_top.png"),
      down: V("blast_furnace_top.png"),
      north: V("blast_furnace_front.png"),
      south: V("blast_furnace_side.png"),
      east: V("blast_furnace_side.png"),
      west: V("blast_furnace_side.png"),
    },
  },
  {
    slug: "tool-station",
    name: "Tool Station",
    group: "Smithing and tools",
    blurb: "Tools from iron to Mythril, smithing and goldsmith tools, keys, lockpicks, mount gear and everyday items.",
    icon: V("iron_pickaxe.png"),
    interaction: "Shift + Right click",
    fallbackTexture: V("iron_pickaxe.png"),
    vanillaBlock: {
      name: "Crafting Table",
      recipe: vanillaStationRecipes.craftingTable,
    },
    cubeFaces: {
      up: V("crafting_table_top.png"),
      down: V("oak_planks.png"),
      north: V("crafting_table_front.png"),
      south: V("crafting_table_side.png"),
      east: V("crafting_table_side.png"),
      west: V("crafting_table_front.png"),
    },
  },
  {
    slug: "gunsmithing-station",
    name: "Gunsmithing Station",
    group: "Smithing and tools",
    blurb: "Builds rifles, pistols, shotguns and launchers from parts you choose.",
    usage:
      "Pick a gun type, then a part for each slot. Each part needs its smith perk, and the materials come out of your inventory when you take the gun. Anyone with the perks can build a gun, but only a Musketeer can fire it.",
    icon: T("ammunition/bronzeshot.png"),
    interaction: "Right click",
    guide: { href: "/wiki/guns", label: "Guns guide" },
    model: gunsmithingStationModel,
    craftRecipe: gunsmithingStationCraft,
  },
  {
    slug: "recycling-station",
    name: "Recycling Station",
    group: "Smithing and tools",
    blurb: "Breaks crafted gear, runes, artifacts and scrap back down into materials.",
    icon: T("stations/recycling-station.png"),
    interaction: "Right click",
    guide: { href: "/wiki/recycler", label: "Recycling guide" },
    model: recyclingModel,
    craftRecipe: recyclingStationRecipe,
  },
  // Wood, stone and building
  {
    slug: "woodworking-station",
    name: "Woodworking Station",
    group: "Wood, stone and building",
    blurb: "Carves decorative wooden furniture. You need the Artisan perk to use it.",
    icon: T("stations/woodworking-station.png"),
    interaction: "Right click",
    guide: { href: "/wiki/woodworking", label: "Woodworking guide" },
    model: woodworkingModel,
    craftRecipe: woodworkingStationCraft,
  },
  {
    slug: "forester-station",
    name: "Forester Station",
    group: "Wood, stone and building",
    blurb: "Logs, leaves, flowers, dyes, moss, arrows, string and other plant blocks.",
    icon: V("oak_log.png"),
    interaction: "Right click",
    fallbackTexture: V("oak_log.png"),
    vanillaBlock: {
      name: "Fletching Table",
      recipe: vanillaStationRecipes.fletchingTable,
    },
    cubeFaces: {
      up: V("fletching_table_top.png"),
      down: V("birch_planks.png"),
      north: V("fletching_table_front.png"),
      south: V("fletching_table_front.png"),
      east: V("fletching_table_side.png"),
      west: V("fletching_table_side.png"),
    },
  },
  {
    slug: "block-station",
    name: "Block Station",
    group: "Wood, stone and building",
    blurb: "Building blocks in bulk, such as stone, concrete, mud and ice, plus a few decorations.",
    icon: V("stone.png"),
    interaction: "Shift + Right click",
    fallbackTexture: V("stone.png"),
    model: stonecutterModel,
    vanillaBlock: {
      name: "Stonecutter",
      recipe: vanillaStationRecipes.stonecutter,
    },
  },
  {
    slug: "copper-station",
    name: "Copper Station",
    group: "Wood, stone and building",
    blurb: "Every copper block: cut, chiselled, grates, bulbs, doors, lanterns, chests and their waxed forms.",
    icon: V("copper_ingot.png"),
    interaction: "Shift + Right click",
    fallbackTexture: V("copper_ingot.png"),
    model: grindstoneModel,
    vanillaBlock: {
      name: "Grindstone",
      recipe: vanillaStationRecipes.grindstone,
    },
  },
  // Food, animals and fishing
  {
    slug: "meal-prep-station",
    name: "Meal Prep Station",
    group: "Food, animals and fishing",
    blurb: "Kitchen tools and cookware: knife, pans, pot, oven, fire pit, cutting board and more.",
    icon: V("campfire.png"),
    interaction: "Right click",
    guide: { href: "/wiki/cooking", label: "Cooking guide" },
    model: mealPrepStationModel,
    craftRecipe: mealPrepStationCraft,
  },
  {
    slug: "animal-station",
    name: "Animal Station",
    group: "Food, animals and fishing",
    blurb: "Companion eggs, pet toys and treats, the Trough, the Mount Whistle and spawn eggs.",
    icon: T("pets/horse_whistle.png"),
    interaction: "Right click",
    guide: { href: "/wiki/companion-pets", label: "Companion Pets guide" },
    model: animalModel,
    craftRecipe: animalStationCraft,
  },
  {
    slug: "fishing-station",
    name: "Fishing Station",
    group: "Food, animals and fishing",
    blurb: "Fishing rods and hooks, and turns fished-up fragments and broken discs into finished items.",
    icon: T("fishing-rods/fishing_rod.png"),
    interaction: "Right click",
    guide: { href: "/wiki/fishing", label: "Fishing guide" },
    model: fishingStationModel,
    craftRecipe: fishingStationCraft,
  },
  // Magic, alchemy and medicine
  {
    slug: "magic-station",
    name: "Magic Station",
    group: "Magic, alchemy and medicine",
    blurb: "Assembles mage staffs, wands and blades, and attunes them with Enchanted Charges.",
    usage:
      "Parts are not crafted on their own: building a weapon takes the cost of each part you pick from your inventory. The cards below show what each part costs.",
    icon: T("magic_crafting/heavy_magical_core.png"),
    interaction: "Right click",
    guide: { href: "/wiki/magic", label: "Magic guide" },
    model: magicModel,
    craftRecipe: magicStationRecipe,
  },
  {
    slug: "rune-station",
    name: "Rune Station",
    group: "Magic, alchemy and medicine",
    blurb: "Turns Enchanted Dust into runestones and Enchanted Charges.",
    icon: T("mmoitems/minor_runestone.png"),
    interaction: "Right click",
    guide: { href: "/wiki/magic", label: "Magic guide" },
    model: runeStationRecipe.output.model,
    craftRecipe: runeStationRecipe,
  },
  {
    slug: "alchemy-station",
    name: "Alchemy Station",
    group: "Magic, alchemy and medicine",
    blurb: "Alchemist Collectors, alchemy powders, health and mana potions, and every kind of gun ammunition.",
    usage: "To use it as an ordinary brewing stand instead, sneak and right-click it with both hands empty.",
    icon: T("materials/alchemy_powder.png"),
    interaction: "Right click",
    fallbackTexture: T("materials/alchemy_powder.png"),
    vanillaBlock: {
      name: "Brewing Stand",
      recipe: vanillaStationRecipes.brewingStand,
    },
    model: brewingStandModel,
  },
  {
    slug: "medicine-station",
    name: "Medicine Station",
    group: "Magic, alchemy and medicine",
    blurb: "Medicines, surgical supplies, prosthetic limbs and the doctor's outfit.",
    icon: T("materials/detoxed_leather.png"),
    interaction: "Right click",
    model: medicineModel,
    craftRecipe: medicineStationCraft,
  },
  // Research, archaeology and music
  {
    slug: "research-station",
    name: "Research Station",
    group: "Research, archaeology and music",
    blurb: "Makes the Research Papers that start research projects.",
    icon: V("book.png"),
    interaction: "Shift + Right click",
    guide: { href: "/wiki/research", label: "Research guide" },
    fallbackTexture: V("book.png"),
    vanillaBlock: {
      name: "Cartography Table",
      recipe: vanillaStationRecipes.cartographyTable,
    },
    cubeFaces: {
      up: V("cartography_table_top.png"),
      down: V("dark_oak_planks.png"),
      north: V("cartography_table_side3.png"),
      south: V("cartography_table_side1.png"),
      east: V("cartography_table_side3.png"),
      west: V("cartography_table_side2.png"),
    },
  },
  {
    slug: "archeology-station",
    name: "Archeology Station",
    group: "Research, archaeology and music",
    blurb: "Archaeology tools and the Archeology Cabinet for registering finds.",
    icon: V("brush.png"),
    interaction: "Right click",
    guide: { href: "/wiki/archaeology", label: "Archaeology guide" },
    model: { url: M("archeology-station.json"), texture: T("stations/archeology-station.png") },
    craftRecipe: archeologyTableRecipe,
  },
  {
    slug: "instrument-station",
    name: "Instrument Station",
    group: "Research, archaeology and music",
    blurb: "Musical instruments and the Music Station for recording songs.",
    icon: V("jukebox_top.png"),
    interaction: "Shift + Right click",
    guide: { href: "/wiki/musical-instruments", label: "Musical Instruments guide" },
    fallbackTexture: V("jukebox_top.png"),
    vanillaBlock: {
      name: "Jukebox",
      recipe: vanillaStationRecipes.jukebox,
    },
    cubeFaces: {
      up: V("jukebox_top.png"),
      down: V("jukebox_side.png"),
      north: V("jukebox_side.png"),
      south: V("jukebox_side.png"),
      east: V("jukebox_side.png"),
      west: V("jukebox_side.png"),
    },
  },
  // Engineering and vehicles
  {
    slug: "engineer-station",
    name: "Engineer Station",
    group: "Engineering and vehicles",
    blurb: "Vehicle munitions, Arcane Fuel, Dynamite, train-track tools, vehicle repair and the Arcane Trace Detector.",
    icon: T("tools/geiger_counter.png"),
    interaction: "Right click",
    guide: { href: "/wiki/vehicles", label: "Vehicles guide" },
    model: engineerModel,
    craftRecipe: engineerStationCraft,
  },
  {
    slug: "engineering-table",
    name: "Engineering Table",
    group: "Engineering and vehicles",
    blurb: "Builds cars, aircraft, trains, carts and fixed guns from blueprints.",
    icon: T("vehicle-stations/engineering_table/front.png"),
    interaction: "Right click",
    guide: { href: "/wiki/vehicles", label: "Vehicles guide" },
    fallbackTexture: T("vehicle-stations/engineering_table/front.png"),
    cubeFaces: {
      up: T("vehicle-stations/engineering_table/top.png"),
      down: T("vehicle-stations/engineering_table/bottom.png"),
      north: T("vehicle-stations/engineering_table/front.png"),
      south: T("vehicle-stations/engineering_table/side.png"),
      east: T("vehicle-stations/engineering_table/side.png"),
      west: T("vehicle-stations/engineering_table/side.png"),
    },
    craftRecipe: engineeringTableCraft,
  },
  {
    slug: "dockyard",
    name: "Dockyard",
    group: "Engineering and vehicles",
    blurb: "Builds ships from blueprints.",
    icon: T("vehicle-stations/dockyard/front.png"),
    interaction: "Right click",
    guide: { href: "/wiki/vehicles", label: "Vehicles guide" },
    model: dockyardModel,
    craftRecipe: dockyardCraft,
  },
  // Letters
  {
    slug: "bird-mailbox",
    name: "Bird Mailbox",
    group: "Letters",
    blurb: "Sends a written Letter to another character by bird.",
    icon: T("bird-mail/mailbox.png"),
    interaction: "Right click",
    guide: { href: "/wiki/bird-mail", label: "Bird Mail guide" },
    model: birdMailboxModel,
    craftRecipe: birdMailboxCraft,
  },
];

/** The sentence that tells a player how to open a station. */
export function stationOpening(station: StationInfo): string {
  if (station.interaction === "Shift + Right click") {
    return `Sneak and right-click it to open the station. A plain right-click still uses the ${station.vanillaBlock?.name ?? "block"} as normal.`;
  }
  return "Right-click it without sneaking to open it.";
}

export function getStationBySlug(slug: string): StationInfo | undefined {
  return stations.find((s) => s.slug === slug);
}

const stationAcquisitionVisuals = new Map(
  stations.flatMap((station) => {
    const recipe = station.craftRecipe ?? station.vanillaBlock?.recipe;
    return recipe?.output.sourceId
      ? [
          [
            recipe.output.sourceId,
            {
              slug: station.slug,
              thumbnail: `/wiki/thumbnails/stations/${station.slug}.webp`,
            },
          ] as const,
        ]
      : [];
  }),
);
export function getStationAcquisitionVisual(sourceId?: string) {
  return sourceId ? stationAcquisitionVisuals.get(sourceId) : undefined;
}

export const stationsSection: WikiSection = {
  nav: {
    href: "/wiki/stations",
    label: "Crafting Stations",
    category: "reference",
    blurb: "Every crafting station: how to get it, how to open it, and what it makes.",
  },
  recipes: [...stationRecipes, ...stationOwnedCraftRecipes],
};
