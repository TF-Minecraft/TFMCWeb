import { stationRecipe } from "./station-recipes";
import type { Recipe, WikiCommandSet, WikiSection } from "./types";
export type GunPart = {
  part: string;
  kind: string;
  for: string;
  tier: string;
  note: string;
  cost: string;
  rank: string;
};
export const gunParts: GunPart[] = [
  {
    part: "Smoothbore Barrel (Long)",
    kind: "Barrel",
    for: "Rifle",
    tier: "I",
    note: "Fires Iron Shot.",
    cost: "4 Iron Ingot",
    rank: "iron",
  },
  {
    part: "Rifled Barrel (Long)",
    kind: "Barrel",
    for: "Rifle",
    tier: "II",
    note: "Fires Iron or Steel Shot, and aims better than smoothbore.",
    cost: "4 Steel Ingot",
    rank: "steel",
  },
  {
    part: "Smoothbore Barrel (Short)",
    kind: "Barrel",
    for: "Pistol",
    tier: "I",
    note: "Fires Iron Shot.",
    cost: "4 Iron Ingot",
    rank: "iron",
  },
  {
    part: "Rifled Barrel (Short)",
    kind: "Barrel",
    for: "Pistol",
    tier: "II",
    note: "Fires Iron or Steel Shot, and aims better than smoothbore.",
    cost: "4 Steel Ingot",
    rank: "steel",
  },
  {
    part: "Spread Barrel",
    kind: "Barrel",
    for: "Shotgun",
    tier: "II",
    note: "Fires Spreadshot of any metal. Makes the gun a shotgun.",
    cost: "4 Steel Ingot",
    rank: "steel",
  },
  {
    part: "Launcher Barrel",
    kind: "Barrel",
    for: "Launcher",
    tier: "III",
    note: "Fires Rockets of any metal. Makes the gun a launcher.",
    cost: "4 Abyssalite Ingot",
    rank: "abyssalite",
  },
  {
    part: "Muzzle Loader",
    kind: "Loader",
    for: "All",
    tier: "I",
    note: "The basic loader.",
    cost: "2 Iron Ingot",
    rank: "iron",
  },
  {
    part: "Breech Loader",
    kind: "Loader",
    for: "Rifle/Shotgun/Launcher",
    tier: "IV",
    note: "Reloads much faster.",
    cost: "2 Mythril Ingot",
    rank: "mythril",
  },
  {
    part: "Single Shot",
    kind: "Chamber",
    for: "Rifle/Pistol/Shotgun",
    tier: "I",
    note: "Holds 1 shot.",
    cost: "2 Iron Ingot",
    rank: "iron",
  },
  {
    part: "Single Shot (launcher)",
    kind: "Chamber",
    for: "Launcher",
    tier: "III",
    note: "Holds 1 rocket. Shown in game as Single Shot.",
    cost: "2 Abyssalite Ingot",
    rank: "abyssalite",
  },
  {
    part: "Quad Shot",
    kind: "Chamber",
    for: "Launcher",
    tier: "IV",
    note: "Holds 4 rockets.",
    cost: "2 Mythril Ingot",
    rank: "mythril",
  },
  {
    part: "Revolver",
    kind: "Chamber",
    for: "Rifle/Pistol",
    tier: "III",
    note: "Holds 6 shots, but reloads slowly and hits a little softer.",
    cost: "2 Abyssalite Ingot",
    rank: "abyssalite",
  },
  {
    part: "Steamlock",
    kind: "Action",
    for: "Rifle/Pistol",
    tier: "I",
    note: "Fires plain Iron Shot only, whatever the barrel. No smoke or muzzle flash, and a little less damage.",
    cost: "2 Iron Ingot",
    rank: "iron",
  },
  {
    part: "Matchlock",
    kind: "Action",
    for: "Rifle/Pistol/Shotgun",
    tier: "II",
    note: "The basic firing action.",
    cost: "2 Steel Ingot",
    rank: "steel",
  },
  {
    part: "Flintlock",
    kind: "Action",
    for: "Rifle/Pistol/Shotgun",
    tier: "III",
    note: "Aims and fires a little better than the Matchlock.",
    cost: "2 Abyssalite Ingot",
    rank: "abyssalite",
  },
  {
    part: "Rocketlock",
    kind: "Action",
    for: "Launcher",
    tier: "III",
    note: "The launcher's action.",
    cost: "2 Abyssalite Ingot",
    rank: "abyssalite",
  },
  {
    part: "Experimental Arclock",
    kind: "Action",
    for: "Rifle",
    tier: "IV",
    note: "Fires only Bronze or Mythril Shot, whatever the barrel. Very accurate, but slow to fire and reload.",
    cost: "2 Mythril Ingot",
    rank: "mythril",
  },
  {
    part: "Oak Stock",
    kind: "Stock",
    for: "Rifle/Shotgun",
    tier: "I",
    note: "Steadies your aim.",
    cost: "2 Refined Barkwood",
    rank: "iron",
  },
  {
    part: "Maplewood Stock",
    kind: "Stock",
    for: "Rifle/Shotgun",
    tier: "II",
    note: "Steadies your aim more.",
    cost: "2 Refined Maplewood",
    rank: "steel",
  },
  {
    part: "Elderwood Stock",
    kind: "Stock",
    for: "Rifle/Shotgun",
    tier: "III",
    note: "Steadies your aim even more.",
    cost: "2 Refined Elderwood",
    rank: "abyssalite",
  },
  {
    part: "Demonwood Stock",
    kind: "Stock",
    for: "Rifle/Shotgun",
    tier: "IV",
    note: "Steadies your aim the most.",
    cost: "2 Refined Demonwood",
    rank: "mythril",
  },
];
// Keyed by part name, not by array index: an unmapped part renders its name in the
// output slot instead of silently borrowing the neighbouring part's texture.
// GunsAndGadgets/parts.yml gives demonwood_stock the same item model as
// elderwood_stock, so both use the server pack's elderwood stock sprite.
const partTextureIds: Record<string, string> = {
  "Smoothbore Barrel (Long)": "smoothbore_barrel_long",
  "Rifled Barrel (Long)": "rifled_barrel_long",
  "Smoothbore Barrel (Short)": "smoothbore_barrel_short",
  "Rifled Barrel (Short)": "rifled_barrel_short",
  "Spread Barrel": "spread_barrel",
  "Launcher Barrel": "launcher_barrel",
  "Muzzle Loader": "muzzle_loader",
  "Breech Loader": "breech_loader",
  "Single Shot": "single_shot",
  "Single Shot (launcher)": "single_shot_rocket",
  "Quad Shot": "quad_shot_rocket",
  Revolver: "revolver",
  Steamlock: "steamlock",
  Matchlock: "matchlock",
  Flintlock: "flintlock",
  Rocketlock: "rocketlock",
  "Experimental Arclock": "arclock",
  "Oak Stock": "oak_stock",
  "Maplewood Stock": "maplewood_stock",
  "Elderwood Stock": "elderwood_stock",
  "Demonwood Stock": "elderwood_stock",
};
/** The sprite for a gun part, by its wiki name. */
export function gunPartTexture(part: string): string {
  return `/wiki/textures/gun-parts/${partTextureIds[part]}.png`;
}
const materialTextures: Record<string, string> = {
  "Iron Ingot": "/wiki/textures/vanilla/iron_ingot.png",
  "Steel Ingot": "/wiki/textures/materials/steel_ingot.png",
  "Abyssalite Ingot": "/wiki/textures/materials/abyssalite_ingot.png",
  "Mythril Ingot": "/wiki/textures/materials/mythril_ingot.png",
  "Refined Barkwood": "/wiki/textures/materials/refined_barkwood.png",
  "Refined Maplewood": "/wiki/textures/materials/refined_maplewood.png",
  "Refined Elderwood": "/wiki/textures/materials/refined_elderwood.png",
  "Refined Demonwood": "/wiki/textures/materials/refined_demonwood.png",
};
function ingredients(text: string) {
  return text.split(" + ").map((value) => {
    const match = value.match(/^(\d+) (.+)$/);
    return { qty: Number(match?.[1] ?? 1), name: match?.[2] ?? value };
  });
}
export const gunPartRecipes: Recipe[] = gunParts.map((part) => ({
  key: `gun-part-${part.part}`,
  title: part.part,
  station: "Gunsmithing Station",
  requirement: `${part.rank[0].toUpperCase() + part.rank.slice(1)} Smith`,
  ingredients: ingredients(part.cost).map((item) => ({ ...item, texture: materialTextures[item.name] })),
  output: {
    name: part.part,
    qty: 1,
    sourceId: `gunsandgadgets:part:${part.part === "Demonwood Stock" ? "demonwood_stock" : part.part === "Single Shot (launcher)" ? "single_shot_launcher" : part.part === "Quad Shot" ? "quad_shot" : partTextureIds[part.part]}`,
    texture: gunPartTexture(part.part),
  },
}));
export const ammoMetals = ["Iron", "Steel", "Bronze", "Mythril"] as const;

export type GunAmmoKind = { kind: string; idSuffix: string; firedBy: string };

/** The three kinds of ammunition. Each is made at the Alchemy Station from one ingot. */
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
