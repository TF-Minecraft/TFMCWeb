import { stationRecipe } from "./station-recipes";
import type { Recipe, WikiCommandSet, WikiSection } from "./types";

// ---------- Arcane Trace Detector (GeigerCounters v2.4.0 on Main) ----------
//
// Main runs one buried cache per character (`mode: player`). Distance thresholds,
// click rates and reward lists stay off the page: the hunt is read by feel, and the
// rewards belong to the Act System.

/**
 * Recipes from the authoritative server `engineer-station.yml`, via
 * `data/generated/stationRecipes.ts`, so this page and the Engineer Station
 * page share the same ingredients. Registered once by `stationsSection`.
 */
export const detectorRecipes: Recipe[] = [
  stationRecipe("gen-engineer-station-dead_geiger_counter"),
  stationRecipe("gen-engineer-station-fuel"),
  stationRecipe("gen-engineer-station-geiger_counter"),
];

/** The plugin's only command is staff-only. */
export const detectorCommands: WikiCommandSet = {
  system: "Arcane Trace Detector",
  href: "/wiki/arcane-trace-detector",
  commands: [],
};

export const detectorSection: WikiSection = {
  nav: {
    href: "/wiki/arcane-trace-detector",
    label: "Arcane Trace Detector",
    category: "magic",
    blurb: "Follow a clicking, glowing detector to your own buried Arcane Cache.",
  },
  // `detectorRecipes` are server recipes registered by `stationsSection`; listing
  // them again here would put them in the recipe index twice.
  commands: detectorCommands,
};
