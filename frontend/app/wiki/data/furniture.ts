import type { WikiCommandSet, WikiSection } from "./types";

// Source: plugins/InteractibleFurniture/furniture/*.yml on Main. The Bucket entry there
// points at an ItemsAdder item that doesn't exist, so it is left out.

export type FurnitureRow = { name: string; id: string };

const cooking = (name: string, id: string): FurnitureRow => ({ name, id: `tfmc_cooking:${id}` });

export const furniture: FurnitureRow[] = [
  cooking("Frying Pan", "frying_pan"),
  cooking("Saucepan", "saucepan"),
  cooking("Pot", "pot"),
  cooking("Bowl", "bowl"),
  cooking("Cutting Board", "cutting_board"),
  cooking("Butter Churn", "butter_churn"),
  cooking("Butter Plate", "butter_plate"),
  cooking("Plate", "plate"),
  cooking("Fire Pit", "fire_pit"),
  cooking("Meat Hook", "meat_hook"),
  cooking("Mixing Bowl", "mixing_bowl"),
  cooking("Milling Stone", "milling_stone"),
  cooking("Oven Bottom", "oven_bottom"),
  cooking("Bread Tray", "bread_tray"),
  cooking("Oven Top", "oven_top"),
  cooking("Liquid Container", "liquid_container"),
  cooking("Sausage Maker", "sausage_maker"),
  cooking("Trough", "trough"),
  cooking("Tool Shelf", "tool_shelf"),
  { name: "Pedestal", id: "tfmc:pedestal" },
  { name: "Artifact Display", id: "tfmc:artifact_display" },
  { name: "Lure", id: "tfmc:lure" },
];

/** Pieces with `carry: true`. */
export const carriableFurniture = [
  "Frying Pan",
  "Saucepan",
  "Pot",
  "Bowl",
  "Butter Plate",
  "Plate",
  "Bread Tray",
  "Trough",
];

export const furnitureRecipes = [
  {
    pieces:
      "Cutting Knife, Ladle, Masher, Frying Pan, Saucepan, Pot, Meat Hook, Sausage Maker, Liquid Container, Bread Tray",
    station: "Meal Prep Station",
    cost: "1 Iron Ingot each",
    time: "2 s",
  },
  { pieces: "Oven Bottom, Oven Top, Milling Stone", station: "Meal Prep Station", cost: "1 Stone each", time: "2 s" },
  { pieces: "Trough", station: "Animal Station", cost: "1 Oak Planks", time: "2 s" },
  {
    pieces: "Tool Shelf, Fire Pit, Cutting Board, Butter Churn, Butter Plate, Mixing Bowl, Empty Cup, Plate, Bowl",
    station: "Meal Prep Station",
    cost: "1 Oak Planks each",
    time: "2 s",
  },
  { pieces: "Pedestal, Artifact Display", station: "Block Station", cost: "2 Cobblestone each", time: "5 s" },
  { pieces: "Lure", station: "Block Station", cost: "2 Oak Planks", time: "2 s" },
];
export const furnitureCommands: WikiCommandSet = {
  system: "InteractibleFurniture",
  href: "/wiki/furniture",
  commands: [],
};
export const furnitureSection: WikiSection = {
  nav: {
    href: "/wiki/furniture",
    label: "Interactive Furniture",
    category: "professions",
    blurb: "Place, fill, carry and pick up cookware, troughs and display stands.",
  },
  commands: furnitureCommands,
};
