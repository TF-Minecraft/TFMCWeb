import { T } from "./helpers";
import type { Recipe } from "./types";

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
