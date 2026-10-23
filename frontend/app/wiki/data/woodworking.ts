import generated from "./generated/woodworkingFurniture.json";
import type { WikiSection } from "./types";

// Source: plugins/Woodworking (categories, projects, hits, materials) and the
// ItemsAdder furniture packs. Regenerate with `python scripts/build-woodworking-furniture.py`.

export type WoodworkingProject = {
  id: string;
  name: string;
  category: string;
  itemId: string;
  modelUrl: string;
  textureUrls: Record<string, string>;
  /** Set instead of `textureUrls` when the single texture is an animated frame strip. */
  textureUrl?: string;
  textureAnimationUrl?: string;
};

export const woodworkingCategories: { id: string; name: string }[] = generated.categories;
export const woodworkingProjects = generated.projects as unknown as WoodworkingProject[];

/** Each action uses its own artisan tool in the main hand. `group` is the hit category (`hit-types.yml`). */
export const woodworkingActions = [
  { action: "Whittle", tool: "Whittling Tool", group: "Woodworking" },
  { action: "Engrave", tool: "Engraving Tool", group: "Woodworking" },
  { action: "Hit", tool: "Hammer Tool", group: "Metalworking" },
  { action: "Small Hit", tool: "Small Hammer Tool", group: "Metalworking" },
  { action: "Etch", tool: "Etching Tool", group: "Metalworking" },
  { action: "Sew", tool: "Sewing Needle", group: "Other" },
];

export const woodworkingMaterials = ["Valewood", "Runebark", "Amberpine", "Goldmaple", "Silk"];

export const woodworkingSection: WikiSection = {
  nav: {
    href: "/wiki/woodworking",
    label: "Woodworking",
    category: "professions",
    blurb: `Carve ${generated.projects.length} decorative furniture pieces, each with a 3D preview.`,
  },
};
