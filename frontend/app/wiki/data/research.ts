import type { WikiCommandSet, WikiSection } from "./types";

// Source: Research v1.4.0 on Main and its live `plugins/Research` configs, the
// MMOItems research station, and RPCharacters' focus pool. Aspect tables, required
// points and reveal thresholds are left off on purpose: they are the puzzle.

export const researchCommands: WikiCommandSet = { system: "Research", href: "/wiki/research", commands: [] };
export const researchSection: WikiSection = {
  nav: {
    href: "/wiki/research",
    label: "Research",
    category: "magic",
    blurb: "Study papers and runestones at a lectern by testing items to find their hidden aspects.",
  },
  commands: researchCommands,
};
