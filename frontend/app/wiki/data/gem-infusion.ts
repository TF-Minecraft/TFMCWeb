import type { WikiCommandSet, WikiSection } from "./types";

// Source: GemInfusion on Main: `config.yml` (gems) and `goldsmithing/projects.yml`.
// Recipes, hit counts and stat ranges are deliberately left out: players work those out in game.

/** The 40 infusable gems, ten per socket type, by their infused names. */
export const gemSocketTypes: { type: string; gems: { name: string; texture: string }[] }[] = [
  {
    type: "Basic",
    gems: [
      "Agate",
      "Jasper",
      "Onyx",
      "Tourmaline",
      "Pearl",
      "Coral",
      "Chrysoprase",
      "Larimar",
      "Rhodonite",
      "Vesuvianite",
    ].map((name) => ({ name, texture: gemTexture(name) })),
  },
  {
    type: "Polished",
    gems: [
      "Turquoise",
      "Peridot",
      "Malachite",
      "Zircon",
      "Apatite",
      "Carnelian",
      "Labradorite",
      "Sardonyx",
      "Variscite",
      "Wulfenite",
    ].map((name) => ({ name, texture: gemTexture(name) })),
  },
  {
    type: "Radiant",
    gems: [
      "Aquamarine",
      "Garnet",
      "Opal",
      "Tanzanite",
      "Moonstone",
      "Sunstone",
      "Spinel",
      "Alexandrite",
      "Direstone",
      "Cloudstone",
    ].map((name) => ({ name, texture: gemTexture(name === "Direstone" ? "Firestone" : name) })),
  },
  {
    type: "Mythical",
    gems: [
      "Ruby",
      "Sapphire",
      "Topaz",
      "Citrine",
      "Morganite",
      "Crystallite",
      "Tiger's Eye",
      "Serpent's Eye",
      "Musgravite",
      "Taaffeite",
    ].map((name) => ({ name, texture: gemTexture(name) })),
  },
];

function gemTexture(name: string) {
  return `/wiki/textures/gems/${name.toLowerCase().replaceAll("'", "").replaceAll(" ", "_")}.png`;
}

export const goldMaterials = [
  { id: "rough_gold", name: "Rough Gold" },
  { id: "moldable_gold", name: "Moldable Gold" },
  { id: "shiny_gold", name: "Shiny Gold" },
];

export const goldTools = [
  { name: "Goldsmith Hammer", texture: "smith_hammer", use: "Hit" },
  { name: "Goldsmith Small Hammer", texture: "small_smith_hammer", use: "Small Hit" },
  { name: "Goldsmith Tinker Hammer", texture: "smith_tinker_tool", use: "Tinker" },
  { name: "Goldsmith Branding Tool", texture: "branding_tool", use: "Check, finish or cancel" },
];

/** The 14 gem projects. The gem-free Golden Key is the 15th and has no texture here. */
export const jewelleryProjects = [
  { id: "gold_ring", name: "Golden Ring", tier: "Minor" },
  { id: "jeweled_gold_ring", name: "Jeweled Ring", tier: "Lesser" },
  { id: "purple_ring", name: "Purple Ring", tier: "Major" },
  { id: "red_ring", name: "Red Ring", tier: "Greater" },
  { id: "green_ring", name: "Green Ring", tier: "Greater" },
  { id: "red_necklace", name: "Red Necklace", tier: "Minor" },
  { id: "purple_necklace", name: "Purple Necklace", tier: "Lesser" },
  { id: "dark_necklace", name: "Green Necklace", tier: "Major" },
  { id: "pendant", name: "Pendant", tier: "Greater" },
  { id: "green_medal", name: "Green Medal", tier: "Minor" },
  { id: "blue_medal", name: "Blue Medal", tier: "Minor" },
  { id: "mirror", name: "Mirror", tier: "Lesser" },
  { id: "chalice", name: "Chalice", tier: "Major" },
  { id: "bracelet", name: "Gold Bracelet", tier: "Greater" },
];

export const gemInfusionCommands: WikiCommandSet = { system: "GemInfusion", href: "/wiki/gem-infusion", commands: [] };
export const gemInfusionSection: WikiSection = {
  nav: {
    href: "/wiki/gem-infusion",
    label: "Gems & Goldsmithing",
    category: "professions",
    blurb: "Infuse gemstones, then set them in gold jewellery.",
  },
  commands: gemInfusionCommands,
};
