import type { WikiCommandSet, WikiSection } from "./types";

/** `/lure leave` is the only player command; `/infestation` is staff-only (Infestations 0.3.2). */
export const infestationsCommands: WikiCommandSet = {
  system: "Infestations",
  href: "/wiki/infestations",
  commands: [
    {
      command: "/lure leave",
      description: "Leaves a lure you joined.",
      notes: "You take damage outside the lure's province until you leave.",
    },
  ],
};

export const infestationsSection: WikiSection = {
  nav: {
    href: "/wiki/infestations",
    label: "Infestations",
    category: "combat",
    blurb: "Swamp provinces overrun by Bog Monsters: fight the ambient spawns or clear the whole thing with a Lure.",
  },
  commands: infestationsCommands,
};
