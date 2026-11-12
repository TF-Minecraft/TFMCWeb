import type { Recipe, Slot, WikiCommandSet, WikiSection } from "./types";
import { constructionStations } from "./vehicle-construction";
import { T, V } from "./helpers";
import modelCatalogue from "../../../public/wiki/models/vehicles/catalogue.json";

// Source: https://github.com/TF-Minecraft/TFMCWeb/blob/main/docs/docs/wiki-research/g-gadgets.md sections 0, 3 and 4.
// Seats, cargo, fuel tanks, blueprints, upkeep and limits checked against Main's live configs on 2026-11-12.
// Balance numbers that change between balance passes (health, speed, burn rate, weapon damage) stay off the wiki.
export interface VehicleSkin {
  id: string;
  name: string;
  modelUrl?: string;
  skinUvUrl?: string;
  textures?: Record<string, string>;
}
export interface VehicleInfo {
  id: string;
  slug: string;
  name: string;
  kind: string;
  seats: string;
  upkeep: number;
  personalLimit: number;
  fuel: string;
  weapons: string;
  cargo: string;
  category: string;
  requirement: string;
  buildTime: string;
  inputs: string;
  station: string;
  fuelStats?: { capacity: string; items: string };
  skins: VehicleSkin[];
}

export const vehicles: VehicleInfo[] = [
  {
    id: "small_car",
    upkeep: 0,
    personalLimit: 3,
    name: "Small Car",
    kind: "Land, terrain-following",
    seats: "1/0/0",
    fuel: "Arcane Fuel",
    weapons: "N/A",
    cargo: "N/A",
    slug: "small-car",
    category: "cars",
    requirement: "None",
    buildTime: "5 min",
    inputs: "16 Oak Log, 8 Iron Ingot, 2 Lantern",
    station: "Engineering Table",
    fuelStats: {
      capacity: "300",
      items: "3",
    },
    skins: [
      {
        id: "small_car",
        name: "Small Car",
      },
    ],
  },
  {
    id: "wooden_cart",
    upkeep: 0,
    personalLimit: 3,
    name: "Wooden Cart",
    kind: "Land, horse-drawn, can tow",
    seats: "1/0/2",
    fuel: "none (horses)",
    weapons: "N/A",
    cargo: "Cart Inventory, 54 slots, opened from the Passenger 2 seat",
    slug: "wooden-cart",
    category: "carts",
    requirement: "None",
    buildTime: "5 min",
    inputs: "16 Oak Log, 8 Iron Ingot, 8 Stick",
    station: "Engineering Table",
    skins: [
      {
        id: "wooden_cart",
        name: "Wooden Cart",
      },
    ],
  },
  {
    id: "horse_cart",
    upkeep: 1,
    personalLimit: 3,
    name: "Horse Cart",
    kind: "Land, horse-drawn, can tow",
    seats: "1/0/1",
    fuel: "none (horses)",
    weapons: "Rear Rifle",
    cargo: "N/A",
    slug: "horse-cart",
    category: "carts",
    requirement: "Engineer I",
    buildTime: "1 day",
    inputs: "64 Oak Log, 16 Iron Ingot, 16 Stick, 8 Steel Ingot",
    station: "Engineering Table",
    skins: [
      {
        id: "horse_cart",
        name: "Horse Cart",
      },
    ],
  },
  {
    id: "simple_locomotive",
    upkeep: 1,
    personalLimit: 1,
    name: "Simple Locomotive",
    kind: "Train (tracked)",
    seats: "1/0/0",
    fuel: "Coal Blocks",
    weapons: "N/A",
    cargo: "N/A",
    slug: "simple-locomotive",
    category: "train",
    requirement: "Engineer I",
    buildTime: "4 h",
    inputs: "16 Oak Log, 16 Iron Ingot, 8 Stick",
    station: "Engineering Table",
    fuelStats: {
      capacity: "900",
      items: "9",
    },
    skins: [
      {
        id: "simple_locomotive",
        name: "Simple Locomotive",
      },
    ],
  },
  {
    id: "coal_car",
    upkeep: 1,
    personalLimit: 3,
    name: "Coal Car",
    kind: "Train car (tracked)",
    seats: "0/0/1",
    fuel: "N/A",
    weapons: "N/A",
    cargo: "Coal Bunker (Coal Blocks only), 27 slots, opened from the Passenger seat",
    slug: "coal-car",
    category: "train",
    requirement: "Engineer I",
    buildTime: "4 h",
    inputs: "16 Oak Log, 16 Iron Ingot, 8 Stick",
    station: "Engineering Table",
    skins: [
      {
        id: "coal_car",
        name: "Coal Car",
      },
    ],
  },
  {
    id: "flat_car",
    upkeep: 1,
    personalLimit: 3,
    name: "Flat Car",
    kind: "Train car (tracked)",
    seats: "0/0/0",
    fuel: "N/A",
    weapons: "N/A",
    cargo: "Flat Car Hold, 54 slots, opened from the chest in the car's menu",
    slug: "flat-car",
    category: "train",
    requirement: "Engineer I",
    buildTime: "4 h",
    inputs: "16 Oak Log, 16 Iron Ingot, 8 Stick",
    station: "Engineering Table",
    skins: [
      {
        id: "flat_car",
        name: "Flat Car",
      },
    ],
  },
  {
    id: "passenger_car",
    upkeep: 1,
    personalLimit: 3,
    name: "Passenger Car",
    kind: "Train car (tracked)",
    seats: "0/0/8",
    fuel: "N/A",
    weapons: "N/A",
    cargo: "N/A",
    slug: "passenger-car",
    category: "train",
    requirement: "Engineer I",
    buildTime: "4 h",
    inputs: "16 Oak Log, 16 Iron Ingot, 8 Stick, 16 Cyan Wool",
    station: "Engineering Table",
    skins: [
      {
        id: "passenger_car",
        name: "Passenger Car",
      },
    ],
  },
  {
    id: "gunboat",
    upkeep: 5,
    personalLimit: 1,
    name: "Gunboat",
    kind: "Sailing ship",
    seats: "1/1/3",
    fuel: "none: wind",
    weapons: "Front Cannon",
    cargo: "N/A",
    slug: "gunboat",
    category: "wooden_ships",
    requirement: "Engineer II",
    buildTime: "1 day",
    inputs: "64 Oak Log, 64 White Wool, 8 Steel Ingot",
    station: "Dockyard",
    skins: [
      {
        id: "gunboat",
        name: "Gunboat",
      },
    ],
  },
  {
    id: "sloop",
    upkeep: 10,
    personalLimit: 1,
    name: "Sloop",
    kind: "Sailing ship",
    seats: "1/1/10",
    fuel: "none: wind",
    weapons: "4 × Naval Cannon (2 per broadside)",
    cargo: "N/A",
    slug: "sloop",
    category: "wooden_ships",
    requirement: "Engineer II",
    buildTime: "2 days",
    inputs: "128 Oak Log, 128 White Wool, 16 Steel Ingot",
    station: "Dockyard",
    skins: [
      {
        id: "sloop",
        name: "Sloop",
      },
    ],
  },
  {
    id: "karve",
    upkeep: 0,
    personalLimit: 1,
    name: "Karve",
    kind: "Sailing boat, no weapons",
    seats: "1/1/3",
    fuel: "none: wind",
    weapons: "N/A",
    cargo: "Cargo Hold, 54 slots, opened from the Passenger 1 seat",
    slug: "karve",
    category: "wooden_ships",
    requirement: "None",
    buildTime: "5 min",
    inputs: "16 Oak Log, 16 White Wool",
    station: "Dockyard",
    skins: [
      {
        id: "karve",
        name: "Karve",
      },
    ],
  },
  {
    id: "torpedoboat",
    upkeep: 5,
    personalLimit: 1,
    name: "Torpedoboat",
    kind: "Steamship",
    seats: "1/1/1",
    fuel: "Coal Blocks",
    weapons: "Torpedo Launcher (fixed)",
    cargo: "N/A",
    slug: "torpedoboat",
    category: "iron_ships",
    requirement: "Engineer II",
    buildTime: "1 day",
    inputs: "64 Iron Ingot, 4 Furnace, 8 Steel Ingot",
    station: "Dockyard",
    fuelStats: {
      capacity: "900",
      items: "9",
    },
    skins: [
      {
        id: "torpedoboat",
        name: "Torpedoboat",
      },
    ],
  },
  {
    id: "ironclad",
    upkeep: 10,
    personalLimit: 1,
    name: "Ironclad",
    kind: "Steamship",
    seats: "1/5/6",
    fuel: "Coal Blocks",
    weapons: "Front Cannon (Cannonball or Clusterbomb), Anti-Air Turret",
    cargo: "N/A",
    slug: "ironclad",
    category: "iron_ships",
    requirement: "Engineer II",
    buildTime: "2 days",
    inputs: "128 Iron Ingot, 8 Furnace, 16 Steel Ingot",
    station: "Dockyard",
    fuelStats: {
      capacity: "2400",
      items: "24",
    },
    skins: [
      {
        id: "ironclad",
        name: "Ironclad",
      },
    ],
  },
  {
    id: "cruiser",
    upkeep: 20,
    personalLimit: 1,
    name: "Cruiser",
    kind: "Steamship",
    seats: "1/4/12",
    fuel: "Coal Blocks",
    weapons: "Front Turret, Back Turret, 2 × Anti-Air Turret",
    cargo: "N/A",
    slug: "cruiser",
    category: "iron_ships",
    requirement: "Engineer II",
    buildTime: "3 days",
    inputs: "256 Iron Ingot, 16 Furnace, 32 Steel Ingot",
    station: "Dockyard",
    fuelStats: {
      capacity: "5400",
      items: "54",
    },
    skins: [
      {
        id: "cruiser",
        name: "Cruiser",
      },
    ],
  },
  {
    id: "monoplane",
    upkeep: 5,
    personalLimit: 1,
    name: "Monoplane",
    kind: "Aircraft",
    seats: "1/0/0",
    fuel: "Arcane Fuel",
    weapons: "Front Rifles, Bomb Bay",
    cargo: "N/A",
    slug: "monoplane",
    category: "planes",
    requirement: "Engineer III",
    buildTime: "1 day",
    inputs: "16 Oak Log, 16 White Wool, 16 Iron Ingot, 8 Steel Ingot, 8 Arcane Crystal",
    station: "Engineering Table",
    fuelStats: {
      capacity: "900",
      items: "9",
    },
    skins: [
      {
        id: "monoplane",
        name: "Monoplane",
      },
      {
        id: "monoplane_black",
        name: "Monoplane (Black)",
      },
      {
        id: "monoplane_chinese",
        name: "Monoplane (Yellow)",
      },
      {
        id: "monoplane_purple",
        name: "Monoplane (Purple Imvata)",
      },
      {
        id: "monoplane_revenor",
        name: "Monoplane (Revenor)",
      },
      {
        id: "monoplane_domenia",
        name: "Monoplane (Domenia)",
      },
      {
        id: "monoplane_sabarissa",
        name: "Monoplane (Sabarissa)",
      },
      {
        id: "monoplane_sabarissa_brown",
        name: "Monoplane (Brown)",
      },
      {
        id: "monoplane_pirate",
        name: "Monoplane (Pirate)",
      },
    ],
  },
  {
    id: "biplane",
    upkeep: 10,
    personalLimit: 1,
    name: "Biplane",
    kind: "Aircraft",
    seats: "1/1/0",
    fuel: "Arcane Fuel",
    weapons: "Front Rifles, Rear Rifle, Bomb Bay",
    cargo: "N/A",
    slug: "biplane",
    category: "planes",
    requirement: "Engineer III",
    buildTime: "2 days",
    inputs: "32 Oak Log, 32 White Wool, 32 Iron Ingot, 16 Steel Ingot, 16 Arcane Crystal",
    station: "Engineering Table",
    fuelStats: {
      capacity: "2400",
      items: "24",
    },
    skins: [
      {
        id: "biplane",
        name: "Biplane",
      },
      {
        id: "biplane_black",
        name: "Biplane (Black)",
      },
      {
        id: "biplane_chinese",
        name: "Biplane (Yellow)",
      },
      {
        id: "biplane_purple",
        name: "Biplane (Purple Imvata)",
      },
      {
        id: "biplane_revenor",
        name: "Biplane (Revenor)",
      },
      {
        id: "biplane_domenia",
        name: "Biplane (Domenia)",
      },
      {
        id: "biplane_sabarissa",
        name: "Biplane (Sabarissa)",
      },
      {
        id: "biplane_sabarissa_brown",
        name: "Biplane (Brown)",
      },
      {
        id: "biplane_pirate",
        name: "Biplane (Pirate)",
      },
    ],
  },
  {
    id: "bomber",
    upkeep: 20,
    personalLimit: 1,
    name: "Bomber",
    kind: "Aircraft",
    seats: "1/2/0",
    fuel: "Arcane Fuel",
    weapons: "Front Rifle, Rear Rifle, Bomb Bay (bomb racks)",
    cargo: "N/A",
    slug: "bomber",
    category: "planes",
    requirement: "Engineer III",
    buildTime: "3 days",
    inputs: "64 Oak Log, 64 White Wool, 64 Iron Ingot, 32 Steel Ingot, 32 Arcane Crystal",
    station: "Engineering Table",
    fuelStats: {
      capacity: "5400",
      items: "54",
    },
    skins: [
      {
        id: "bomber",
        name: "Bomber",
      },
    ],
  },
  {
    id: "scout",
    upkeep: 0,
    personalLimit: 1,
    name: "Scout",
    kind: "Aircraft, two seats, no weapons",
    seats: "1/0/1",
    fuel: "Arcane Fuel",
    weapons: "N/A",
    cargo: "N/A",
    slug: "scout",
    category: "planes",
    requirement: "None",
    buildTime: "5 min",
    inputs: "16 Oak Log, 16 White Wool, 8 Iron Ingot",
    station: "Engineering Table",
    fuelStats: {
      capacity: "300",
      items: "3",
    },
    skins: [
      {
        id: "scout",
        name: "Scout",
      },
    ],
  },
  {
    id: "cloudskimmer",
    upkeep: 5,
    personalLimit: 1,
    name: "Cloudskimmer",
    kind: "Airship",
    seats: "1/1/3",
    fuel: "Arcane Fuel",
    weapons: "Anti-Air Turret, Bomb Bay",
    cargo: "Cargo Hold, 54 slots, opened from the Passenger seat",
    slug: "cloudskimmer",
    category: "airships",
    requirement: "Engineer III",
    buildTime: "1 day",
    inputs: "16 Oak Log, 16 White Wool, 16 Iron Ingot, 8 Steel Ingot, 8 Arcane Crystal",
    station: "Engineering Table",
    fuelStats: {
      capacity: "900",
      items: "9",
    },
    skins: [
      {
        id: "cloudskimmer",
        name: "Cloudskimmer",
      },
    ],
  },
  {
    id: "gyrobomber",
    upkeep: 10,
    personalLimit: 1,
    name: "Gyrobomber",
    kind: "Airship",
    seats: "1/1/5",
    fuel: "Arcane Fuel",
    weapons: "2 × Bomb Bay, 4 × Rifle turret (front/rear/left/right)",
    cargo: "Cargo Hold, 54 slots, opened from the Bombardier 2 seat (left bomb bay)",
    slug: "gyrobomber",
    category: "airships",
    requirement: "Engineer III",
    buildTime: "2 days",
    inputs: "32 Oak Log, 32 White Wool, 32 Iron Ingot, 16 Steel Ingot, 16 Arcane Crystal",
    station: "Engineering Table",
    fuelStats: {
      capacity: "2400",
      items: "24",
    },
    skins: [
      {
        id: "gyrobomber",
        name: "Gyrobomber",
      },
    ],
  },
  {
    id: "behemoth",
    upkeep: 20,
    personalLimit: 1,
    name: "Behemoth",
    kind: "Airship, flagship",
    seats: "1/2/13",
    fuel: "Arcane Fuel",
    weapons: "Front Cannon (autocannon), Left + Right Cannon, 4 × Anti-Air Turret",
    cargo:
      "Cargo Hold 1, 54 slots, opened from the Passenger 1 seat; Cargo Hold 2, 54 slots, opened from the Passenger 2 seat; Cargo Hold 3, 54 slots, opened from the Passenger 3 seat; Cargo Hold 4, 54 slots, opened from the Passenger 4 seat",
    slug: "behemoth",
    category: "airships",
    requirement: "Engineer III",
    buildTime: "3 days",
    inputs: "64 Oak Log, 64 White Wool, 64 Iron Ingot, 32 Steel Ingot, 32 Arcane Crystal",
    station: "Engineering Table",
    fuelStats: {
      capacity: "5400",
      items: "54",
    },
    skins: [
      {
        id: "behemoth",
        name: "Behemoth",
      },
    ],
  },
  {
    id: "windrider",
    upkeep: 0,
    personalLimit: 1,
    name: "Windrider",
    kind: "Hot-air balloon, no weapons",
    seats: "1/1/3",
    fuel: "Arcane Fuel",
    weapons: "N/A",
    cargo: "Cargo Hold, 27 slots, opened from the Passenger 1 seat",
    slug: "windrider",
    category: "airships",
    requirement: "None",
    buildTime: "5 min",
    inputs: "16 Oak Log, 16 White Wool, 8 Iron Ingot",
    station: "Engineering Table",
    fuelStats: {
      capacity: "300",
      items: "3",
    },
    skins: [
      {
        id: "windrider",
        name: "Windrider",
      },
    ],
  },
  {
    id: "aa_turret",
    upkeep: 1,
    personalLimit: 1,
    name: "Anti-Air Turret",
    kind: "Emplacement",
    seats: "1/0/0",
    fuel: "N/A",
    weapons: "Anti-Air Turret",
    cargo: "N/A",
    slug: "aa-turret",
    category: "fixed",
    requirement: "Engineer I",
    buildTime: "1 day",
    inputs: "16 Iron Ingot, 8 Oak Log, 8 Steel Ingot",
    station: "Engineering Table",
    skins: [
      {
        id: "aa_turret",
        name: "Anti-Air Turret",
      },
    ],
  },
  {
    id: "anti_air",
    upkeep: 5,
    personalLimit: 1,
    name: "Anti-Air",
    kind: "Emplacement",
    seats: "1/0/0",
    fuel: "N/A",
    weapons: "Flak Cannon",
    cargo: "N/A",
    slug: "anti-air",
    category: "fixed",
    requirement: "Engineer I",
    buildTime: "3 days",
    inputs: "64 Iron Ingot, 32 Oak Log, 32 Steel Ingot",
    station: "Engineering Table",
    skins: [
      {
        id: "anti_air",
        name: "Anti-Air",
      },
    ],
  },
  {
    id: "field_artillery",
    upkeep: 2,
    personalLimit: 1,
    name: "Field Artillery",
    kind: "Emplacement, towable",
    seats: "1/0/0",
    fuel: "N/A",
    weapons: "Field Artillery (naval cannon)",
    cargo: "N/A",
    slug: "field-artillery",
    category: "fixed",
    requirement: "Engineer I",
    buildTime: "2 days",
    inputs: "32 Iron Ingot, 16 Oak Log, 16 Steel Ingot",
    station: "Engineering Table",
    skins: [
      {
        id: "field_artillery",
        name: "Field Artillery",
      },
    ],
  },
  {
    id: "fixed_artillery",
    upkeep: 5,
    personalLimit: 1,
    name: "Fixed Artillery",
    kind: "Emplacement",
    seats: "1/0/0",
    fuel: "N/A",
    weapons: "Cannon (called Flak Cannon in game) that fires Cannonballs or Clusterbombs",
    cargo: "N/A",
    slug: "fixed-artillery",
    category: "fixed",
    requirement: "Engineer I",
    buildTime: "3 days",
    inputs: "64 Iron Ingot, 32 Oak Log, 32 Steel Ingot",
    station: "Engineering Table",
    skins: [
      {
        id: "fixed_artillery",
        name: "Fixed Artillery",
      },
    ],
  },
];

// Generated asset mappings are authoritative, including texture IDs whose order
// differs from the slot index and skins sharing the base vehicle skeleton.
for (const vehicle of vehicles) {
  for (const skin of vehicle.skins) {
    const asset = (modelCatalogue as Record<string, Partial<VehicleSkin>>)[skin.id];
    if (asset) Object.assign(skin, asset);
  }
}

/** Seat counts from the "captain/mechanic/passenger" seats field. */
export function getSeatCounts(vehicle: Pick<VehicleInfo, "seats">) {
  const [captain = 0, mechanic = 0, passenger = 0] = vehicle.seats.split("/").map((count) => Number(count) || 0);
  return { captain, mechanic, passenger, total: captain + mechanic + passenger };
}

export function getVehicleBySlug(slug: string): VehicleInfo | undefined {
  return vehicles.find((vehicle) => vehicle.slug === slug);
}
export const vehicleCommands: WikiCommandSet = {
  system: "Vehicles & Construction",
  href: "/wiki/vehicles",
  commands: [
    {
      command: "/vf keybinds",
      description: "Prints controls for your current vehicle and its current state. Sit in a vehicle first.",
    },
    {
      command: "/vf findvehicles",
      description:
        "Lists your vehicles and their world coordinates. An unloaded vehicle can show location unknown (stored).",
    },
  ],
};
// Every distinct ingredient name across `vehicles[].inputs`. Vanilla items live under
// `vanilla/`, server-added ones under `materials/`, so the root cannot be derived from
// the name. Every configured ingredient has a matching icon.
const vehicleInputTextures: Record<string, string> = {
  "Oak Log": V("oak_log.png"),
  "White Wool": V("white_wool.png"),
  "Cyan Wool": V("cyan_wool.png"),
  // Exact vanilla 1.21.10 client textures: block/furnace_front.png and item/lantern.png.
  Furnace: V("furnace.png"),
  Lantern: V("lantern.png"),
  "Iron Ingot": V("iron_ingot.png"),
  Stick: V("stick.png"),
  "Steel Ingot": T("materials/steel_ingot.png"),
  "Arcane Crystal": T("materials/arcane_crystal.png"),
};

/**
 * The output slot for a vehicle: a live 3D preview of its first (base) skin.
 * `VehicleSkin.modelUrl`/`textures` map onto `Slot.model`'s `url`/`textures`.
 * `skinUvUrl` has no equivalent in the `Slot` model shape, so a skin that needs
 * one is not previewable here; base skins do not use it.
 */
function vehicleOutputSlot(vehicle: VehicleInfo): Slot {
  const skin = vehicle.skins[0];
  if (!skin?.modelUrl || skin.skinUvUrl) return { name: vehicle.name, qty: 1 };
  return { name: vehicle.name, qty: 1, model: { url: skin.modelUrl, textures: skin.textures } };
}

export const vehicleRecipes: Recipe[] = vehicles.map((vehicle) => ({
  key: `vehicle-${vehicle.slug}`,
  title: vehicle.name,
  station: vehicle.station,
  time:
    ((Number(vehicle.buildTime.match(/(\d+) days?/)?.[1] ?? 0) * 24 +
      Number(vehicle.buildTime.match(/(\d+) h/)?.[1] ?? 0)) *
      60 +
      Number(vehicle.buildTime.match(/(\d+) min/)?.[1] ?? 0)) *
    60,
  requirement: vehicle.requirement,
  ingredients: vehicle.inputs.split(", ").map((input) => {
    const [qty, ...rest] = input.split(" ");
    const name = rest.join(" ");
    const texture = vehicleInputTextures[name];
    return texture ? { name, qty: Number(qty), texture } : { name, qty: Number(qty) };
  }),
  output: vehicleOutputSlot(vehicle),
  note: `Construction takes ${vehicle.buildTime}; the vehicle spawns in the world.`,
}));
export const vehiclesSection: WikiSection = {
  nav: {
    href: "/wiki/vehicles",
    label: "Vehicles & Construction",
    category: "vehicles",
    blurb: `Build, crew, fuel and repair all ${vehicles.length} vehicles, with 3D previews and complete blueprints.`,
  },
  commands: vehicleCommands,
  recipes: [...vehicleRecipes, ...constructionStations],
};

export const vehicleAmmunition: string[][] = [
  ["Bullets", "bullet", "m.utils.bullet_box", "100", "Used by rifles and Anti-Air Turrets"],
  [
    "Flak Shells",
    "flak_bullet",
    "m.utils.flak_shells",
    "30",
    "Explosive. Used by the Autocannon and the Anti-Air Flak Cannon",
  ],
  ["Cannonball", "cannonball", "m.utils.cannonball", "1", "Explosive, sets fire and applies Poison"],
  ["Small Bomb", "small_bomb", "m.utils.small_bomb", "1", "Explosive, dropped from bomb bays"],
  [
    "Small Bomb (rack)",
    "small_bomb_rack",
    "m.utils.small_bomb_rack",
    "8",
    "Same bomb, 8 per load. Bomber, Cloudskimmer, Gyrobomber",
  ],
  [
    "Clusterbomb",
    "clusterbomb",
    "m.utils.clusterbomb",
    "1",
    "Splits into submunitions. Behemoth, Cruiser, Fixed Artillery, Ironclad Front Cannon",
  ],
  ["Torpedo", "torpedo", "m.utils.torpedo", "1", "Torpedoboat only"],
];

/** Weapon template, display name, accepted ammunition and how it is aimed. */
export const vehicleWeapons: string[][] = [
  ["gun_turret", "Mounted Rifle", "bullet", "Aims toward your cursor"],
  ["naval_cannon", "Naval Cannon", "cannonball (+ clusterbomb on some)", "W/S elevation, A/D traverse"],
  ["aa_turret", "Anti-Air Turret", "bullet", "W/S elevation, A/D traverse"],
  ["autocannon", "Autocannon", "flak_bullet", "W/S elevation, A/D traverse"],
  ["flak_cannon", "Flak Cannon (Anti-Air)", "flak_bullet", "W/S elevation, A/D traverse"],
];

export const vehicleTrackItems: string[][] = [
  [
    "Train Track Layer",
    "m.utils.train_track_layer",
    "Left-click solid ground to mark the start, then right-click the end. Uses Train Track items from your inventory.",
  ],
  ["Train Track Remover", "m.utils.train_track_remover", "Left-click track to remove it. Move trains off it first."],
  [
    "Train Track Recorder",
    "m.utils.train_track_recorder",
    "Records a route, one lap of a loop or a run out along a line and back, so the Locomotive can drive it by itself.",
  ],
  [
    "Train Track Junction",
    "m.utils.train_track_junction",
    "Right-click existing track, then right-click the branch end with the Train Track Layer.",
  ],
  [
    "Train Track Dock",
    "m.utils.train_track_dock",
    "Without sneaking, right-click a chest, barrel, shulker box, hopper, dispenser or dropper to make it a load dock, again for an unload dock, again to remove it.",
  ],
];
