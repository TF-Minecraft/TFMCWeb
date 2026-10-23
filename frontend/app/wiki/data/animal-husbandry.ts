import type { WikiCommandSet, WikiSection } from "./types";

export const animalHusbandryCommands: WikiCommandSet = {
  system: "Animal Husbandry",
  href: "/wiki/animal-husbandry",
  commands: [
    {
      command: "/animals",
      aliases: ["/livestock"],
      description: "Lists the animals your current character owns or shares, and where each was last seen.",
      notes:
        "Shows each animal's name and kind, whether it is still growing, and whether it is happy, hungry or dirty, plus how many of your account's 15 places are used. Click the coordinates to copy them. If a place is missing, visit that animal once.",
    },
  ],
};

export const animalHusbandrySection: WikiSection = {
  nav: {
    href: "/wiki/animal-husbandry",
    label: "Animal Husbandry",
    category: "food",
    blurb: "Claim farm animals, care for them and breed them for better meat, milk and materials.",
  },
  commands: animalHusbandryCommands,
};
