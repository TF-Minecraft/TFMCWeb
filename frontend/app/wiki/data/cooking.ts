import type { WikiCommandSet, WikiSection } from "./types";

/**
 * Cooking (drefvelin/cooking) has no cooking commands: every interaction is
 * done on furniture. Its one player command, /animals, is listed under Animal
 * Husbandry. Recorded as an empty array per the README rule: "no commands" is
 * a fact, not an omission.
 */
export const cookingCommands: WikiCommandSet = {
  system: "Cooking",
  href: "/wiki/cooking",
  commands: [],
};

export const cookingSection: WikiSection = {
  nav: {
    href: "/wiki/cooking",
    label: "Cooking",
    category: "food",
    blurb: "Cook on furniture you place: pans, pots, ovens, cutting boards and more.",
  },
  commands: cookingCommands,
};
