import type { WikiCommandSet, WikiSection } from "./types";

// ---------- Gathering (Gathering v0.3.0 on Main) ----------
//
// Checked against Main on 2026-11-19: `Gathering/config.yml` (Mental Point cost,
// spot lifetime), `Gathering/spot-types.yml` and `Gathering/categories.yml`
// (biomes, seeds, gemstones, treasure). Spawn chances, weights and drop counts stay
// off the page.
// Desert spot types need grass, so they never appear there and the page leaves the
// Desert out. `/gathering` is staff-only.

export const gatheringCommands: WikiCommandSet = {
  system: "Gathering",
  href: "/wiki/gathering",
  commands: [
    {
      command: "/gather",
      description: "Starts or stops searching for gathering spots. Searching costs Mental Points while it is on.",
      notes: "/gather on and /gather off also work.",
    },
  ],
};

export const gatheringSection: WikiSection = {
  nav: {
    href: "/wiki/gathering",
    label: "Gathering",
    category: "gathering",
    blurb: "Search the land with /gather for seeds, gemstones and treasure.",
  },
  commands: gatheringCommands,
};
