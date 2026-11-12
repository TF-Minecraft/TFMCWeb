import { V } from "./helpers";
import { stationRecipe } from "./station-recipes";
import type { Recipe, Slot, WikiCommandSet, WikiSection } from "./types";

// GunsAndGadgets 2.4.0 with Main's `parts.yml`, `metals.yml` and `config.yml`. Every part is forged
// from any metal (or, for stocks and grips, wood) the player's Smith perk allows, so the wiki lists
// each part once. Numbers stay out (they move with balance passes); the notes say what a part is
// good and bad at in words.

export type GunPartKind = "Barrel" | "Loader" | "Chamber" | "Action" | "Stock" | "Grip";

export type GunPart = {
  part: string;
  kind: GunPartKind;
  /** Gun types the part fits, as a readable list. */
  for: string;
  cost: string;
  note: string;
};

export const gunParts: GunPart[] = [
  {
    part: "Long Smoothbore Barrel",
    kind: "Barrel",
    for: "Rifle",
    cost: "4 ingots",
    note: "Hits hard and flies fast. Armour stops more of it, and it loses damage sooner over distance.",
  },
  {
    part: "Long Rifled Barrel",
    kind: "Barrel",
    for: "Rifle",
    cost: "4 ingots",
    note: "Accurate, bites through armour and keeps its damage further out. Hits softer, and is a little slower to reload and draw.",
  },
  {
    part: "Carbine Barrel",
    kind: "Barrel",
    for: "Rifle",
    cost: "4 ingots",
    note: "Short and light. Steady on the move and mounted, quick to draw and reload. Hits softer and loses damage sooner over distance.",
  },
  {
    part: "Heavy Barrel",
    kind: "Barrel",
    for: "Rifle",
    cost: "6 ingots",
    note: "A marksman's barrel. Keeps its damage much further out and is steady when you crouch. Poor on the move, slow to reload and draw, and hits softer.",
  },
  {
    part: "Short Smoothbore Barrel",
    kind: "Barrel",
    for: "Pistol",
    cost: "4 ingots",
    note: "Steady on the move and quick to draw. Armour stops more of it, and it loses damage sooner over distance.",
  },
  {
    part: "Short Rifled Barrel",
    kind: "Barrel",
    for: "Pistol",
    cost: "4 ingots",
    note: "Accurate, bites through armour and keeps its damage further out. Hits softer and reloads slower.",
  },
  {
    part: "Duelling Barrel",
    kind: "Barrel",
    for: "Pistol",
    cost: "4 ingots",
    note: "The most accurate pistol barrel, made for one careful shot standing still. Slow to reload and draw, poor on the move, and hits softer.",
  },
  {
    part: "Spread Barrel",
    kind: "Barrel",
    for: "Shotgun",
    cost: "4 ingots",
    note: "A medium cone of pellets with good range. Slower to reload.",
  },
  {
    part: "Sawn-off Barrel",
    kind: "Barrel",
    for: "Shotgun",
    cost: "4 ingots",
    note: "A wide cone of pellets, brutal up close. Steady on the move and quick to draw. Short range, and slower to reload.",
  },
  {
    part: "Fowling Barrel",
    kind: "Barrel",
    for: "Shotgun",
    cost: "4 ingots",
    note: "A tight cone of pellets that carries far. Much slower to reload, and slower to draw.",
  },
  {
    part: "Launcher Barrel",
    kind: "Barrel",
    for: "Launcher",
    cost: "4 ingots",
    note: "The plain rocket tube. Its rockets pierce armour. Not very accurate, and slow to reload.",
  },
  {
    part: "Short Launch Tube",
    kind: "Barrel",
    for: "Launcher",
    cost: "4 ingots",
    note: "Steady on the move, quick to draw, and reloads faster than the Launcher Barrel. Not very accurate, and its rockets hit softer.",
  },
  {
    part: "Long Launch Tube",
    kind: "Barrel",
    for: "Launcher",
    cost: "4 ingots",
    note: "The most accurate tube, with fast rockets that pierce armour. Its rockets hit softer. Slower to draw, and the slowest tube to reload.",
  },
  {
    part: "Muzzle Loader",
    kind: "Loader",
    for: "Rifle, Pistol, Shotgun, Launcher",
    cost: "2 ingots",
    note: "The simple loader. Adds accuracy, bullet speed and reload speed.",
  },
  {
    part: "Breech Loader",
    kind: "Loader",
    for: "Rifle, Pistol, Shotgun, Launcher",
    cost: "2 ingots",
    note: "Loads from the back. Reloads faster and fires again sooner.",
  },
  {
    part: "Patch & Ramrod",
    kind: "Loader",
    for: "Rifle, Pistol",
    cost: "2 ingots",
    note: "The most accurate loader, and it adds armour piercing. Slower to reload.",
  },
  {
    part: "Single Shot",
    kind: "Chamber",
    for: "Rifle, Pistol, Shotgun",
    cost: "2 ingots",
    note: "Holds 1 shot. Accurate and quick to reload.",
  },
  {
    part: "Double Chamber",
    kind: "Chamber",
    for: "Rifle, Pistol, Shotgun",
    cost: "2 ingots",
    note: "Holds 2 shots, each a little weaker. Much slower to fire again, and slower to reload and draw.",
  },
  {
    part: "Revolver",
    kind: "Chamber",
    for: "Rifle, Pistol",
    cost: "2 ingots",
    note: "Holds 6 shots, each much lighter. Much slower to reload, and slower to draw and fire again.",
  },
  {
    part: "Proof Chamber",
    kind: "Chamber",
    for: "Rifle, Pistol",
    cost: "2 ingots",
    note: "Holds 1 shot and loads powered shot only. Pierces much more armour. Louder, and slower to reload and draw.",
  },
  {
    part: "Single Shot (launcher)",
    kind: "Chamber",
    for: "Launcher",
    cost: "2 ingots",
    note: "Holds 1 rocket, which hits harder. Shown in game as Single Shot.",
  },
  {
    part: "Multi-Tube Chamber",
    kind: "Chamber",
    for: "Launcher",
    cost: "2 ingots",
    note: "Holds 2 rockets in steel, 3 in abyssalite or 4 in mythril. Can't be made in iron. Its rockets are much lighter and less accurate, and each extra tube slows the reload.",
  },
  {
    part: "Matchlock",
    kind: "Action",
    for: "Rifle, Pistol, Shotgun",
    cost: "2 ingots",
    note: "Simple and accurate. Slower to draw.",
  },
  {
    part: "Flintlock",
    kind: "Action",
    for: "Rifle, Pistol, Shotgun",
    cost: "2 ingots",
    note: "Quick to reload and fire again. A little less accurate.",
  },
  {
    part: "Steamlock",
    kind: "Action",
    for: "Rifle, Pistol",
    cost: "2 ingots",
    note: "Quiet, with no smoke or muzzle flash, and quick to fire again. Loads plain shot only. Slightly slower to draw.",
  },
  {
    part: "Wheellock",
    kind: "Action",
    for: "Rifle, Pistol, Shotgun",
    cost: "2 ingots",
    note: "Much steadier mounted, and steadier on the move.",
  },
  {
    part: "Experimental Arclock",
    kind: "Action",
    for: "Rifle",
    cost: "2 ingots",
    note: "Scoped and precise. Much slower to reload and fire again, and slower to draw.",
  },
  {
    part: "Rocketlock",
    kind: "Action",
    for: "Launcher",
    cost: "2 ingots",
    note: "The more accurate launcher action. Slower to reload.",
  },
  {
    part: "Fuse Igniter",
    kind: "Action",
    for: "Launcher",
    cost: "2 ingots",
    note: "A lit fuse. Doesn't slow the reload, but it is slower to draw and to fire again than the Rocketlock.",
  },
  {
    part: "Standard Stock",
    kind: "Stock",
    for: "Rifle, Shotgun",
    cost: "2 refined wood + 2 wool",
    note: "A plain stock that adds accuracy. Better wool adds more.",
  },
  {
    part: "Saddle Stock",
    kind: "Stock",
    for: "Rifle, Shotgun",
    cost: "2 refined wood + 2 leather",
    note: "Steady on the move and mounted, and quick to draw. Better leather makes it steadier.",
  },
  {
    part: "Cheek-rest Stock",
    kind: "Stock",
    for: "Rifle",
    cost: "2 refined wood + 2 leather",
    note: "The most accurate stock, and much steadier when you crouch. Better leather steadies it more. Worse on the move, and slower to reload and draw.",
  },
  {
    part: "Padded Stock",
    kind: "Stock",
    for: "Rifle, Shotgun",
    cost: "2 refined wood + 2 feathers",
    note: "Soaks the kick so you fire again sooner. Better feathers make it quicker still. Slower to draw.",
  },
  {
    part: "Standard Grip",
    kind: "Grip",
    for: "Pistol",
    cost: "2 refined wood + 2 leather",
    note: "A plain grip that adds accuracy. Better leather adds more.",
  },
  {
    part: "Bird's-head Grip",
    kind: "Grip",
    for: "Pistol",
    cost: "2 refined wood + 2 feathers",
    note: "Much quicker to draw and steadier on the move. Better feathers improve both.",
  },
  {
    part: "Pommel Grip",
    kind: "Grip",
    for: "Pistol",
    cost: "2 refined wood + 2 wool + 1 Copper Ingot",
    note: "The most accurate grip, and steadier when you crouch. Better wool steadies it more. Slower to draw.",
  },
  {
    part: "Wrapped Grip",
    kind: "Grip",
    for: "Pistol",
    cost: "2 refined wood + 2 wool",
    note: "Steady on the move and mounted. Better wool makes it steadier. Slightly slower to draw.",
  },
];

/** Part name to its GunsAndGadgets id, which also names its icon (the pack's material-free part icon). */
const partIds: Record<string, string> = {
  "Long Smoothbore Barrel": "smoothbore_barrel_long",
  "Long Rifled Barrel": "rifled_barrel_long",
  "Carbine Barrel": "carbine_barrel",
  "Heavy Barrel": "heavy_barrel",
  "Short Smoothbore Barrel": "smoothbore_barrel_short",
  "Short Rifled Barrel": "rifled_barrel_short",
  "Duelling Barrel": "duelling_barrel",
  "Spread Barrel": "spread_barrel",
  "Sawn-off Barrel": "sawn_off_barrel",
  "Fowling Barrel": "fowling_barrel",
  "Launcher Barrel": "launcher_barrel",
  "Short Launch Tube": "short_launch_tube",
  "Long Launch Tube": "long_launch_tube",
  "Muzzle Loader": "muzzle_loader",
  "Breech Loader": "breech_loader",
  "Patch & Ramrod": "patch_ramrod",
  "Single Shot": "single_shot",
  "Double Chamber": "double_chamber",
  Revolver: "revolver",
  "Proof Chamber": "proof_chamber",
  "Single Shot (launcher)": "single_shot_launcher",
  "Multi-Tube Chamber": "multi_tube_chamber",
  Matchlock: "matchlock",
  Flintlock: "flintlock",
  Steamlock: "steamlock",
  Wheellock: "wheellock",
  "Experimental Arclock": "arclock",
  Rocketlock: "rocketlock",
  "Fuse Igniter": "fuse_igniter",
  "Standard Stock": "standard_stock",
  "Saddle Stock": "saddle_stock",
  "Cheek-rest Stock": "cheek_rest_stock",
  "Padded Stock": "padded_stock",
  "Standard Grip": "standard_grip",
  "Bird's-head Grip": "birdshead_grip",
  "Pommel Grip": "pommel_grip",
  "Wrapped Grip": "wrapped_grip",
};

/** The sprite for a gun part, by its wiki name. */
export function gunPartTexture(part: string): string {
  return `/wiki/textures/gun-parts/${partIds[part]}.png`;
}

const ingot = (name: string, file: string, qty: number): Slot => ({ name, qty, texture: file });
const iron = (qty: number) => ingot("Iron Ingot", V("iron_ingot.png"), qty);
const steel = (qty: number) => ingot("Steel Ingot", "/wiki/textures/materials/steel_ingot.png", qty);
const barkwood: Slot = { name: "Refined Barkwood", qty: 2, texture: "/wiki/textures/materials/refined_barkwood.png" };
const fittings: Record<string, Slot> = {
  leather: { name: "Leather", qty: 2, texture: V("leather.png") },
  wool: { name: "White Wool", qty: 2, texture: V("white_wool.png") },
  feathers: { name: "Feather", qty: 2, texture: V("feather.png") },
};
const copper: Slot = { name: "Copper Ingot", qty: 1, texture: V("copper_ingot.png") };

const METAL_NOTE =
  "Shown in the lowest metal it can be made from. Each metal needs its own Smith perk and costs the same number of its ingots.";
const WOOD_NOTE =
  "Shown in barkwood with a plain fitting. Other woods and better fittings cost the same amounts. Each wood needs its own Smith perk, and fittings need none.";

/** One Gunsmithing Station recipe per part, shown at the lowest perk it can be made with. */
function partRecipe(part: GunPart): Recipe {
  const wooden = part.kind === "Stock" || part.kind === "Grip";
  const ingots = Number(part.cost.match(/^(\d+) ingots$/)?.[1] ?? 0);
  const noIron = part.part === "Multi-Tube Chamber";
  const fitting = Object.keys(fittings).find((kind) => part.cost.includes(`2 ${kind}`));
  const ingredients: Slot[] = wooden
    ? [barkwood, fittings[fitting!], ...(part.cost.includes("Copper Ingot") ? [copper] : [])]
    : [noIron ? steel(ingots) : iron(ingots)];
  return {
    key: `gun-part-${partIds[part.part]}`,
    title: part.part,
    station: "Gunsmithing Station",
    requirement: noIron ? "Steel Smith" : "Iron Smith",
    ingredients,
    output: {
      name: part.part,
      qty: 1,
      sourceId: `gunsandgadgets:part:${partIds[part.part]}`,
      texture: gunPartTexture(part.part),
    },
    note: wooden ? WOOD_NOTE : METAL_NOTE,
  };
}

export const gunPartRecipes: Recipe[] = gunParts.map(partRecipe);

export const ammoMetals = ["Iron", "Steel", "Bronze", "Mythril"] as const;

export type GunAmmoKind = { kind: string; idSuffix: string; firedBy: string };

/** The three kinds of ammunition, made at the Alchemy Station (`MMOItems/crafting-stations/alchemy-station.yml`). */
export const gunAmmoKinds: GunAmmoKind[] = [
  { kind: "Shot", idSuffix: "shot", firedBy: "Rifles and pistols" },
  { kind: "Spreadshot", idSuffix: "spreadshot", firedBy: "Shotguns" },
  { kind: "Rocket", idSuffix: "rocket", firedBy: "Launchers" },
];

/** The Alchemy Station recipe for one metal and kind, e.g. Steel Spreadshot. */
export function gunAmmoRecipe(metal: (typeof ammoMetals)[number], kind: GunAmmoKind, powered = false): Recipe {
  const id = `${metal.toLowerCase()}${kind.idSuffix}`;
  return stationRecipe(`gen-alchemy-station-${id}${powered ? "-powered" : ""}`);
}

export const gunsCommands: WikiCommandSet = { system: "GunsAndGadgets", href: "/wiki/guns", commands: [] };
export const gunsSection: WikiSection = {
  nav: {
    href: "/wiki/guns",
    label: "Guns & Gunsmithing",
    category: "combat",
    blurb: "Build a gun from parts at the Gunsmithing Station, make ammunition, and fire it as a Musketeer.",
  },
  recipes: gunPartRecipes,
  commands: gunsCommands,
};
