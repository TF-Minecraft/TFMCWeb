import type { WikiCommandSet, WikiSection } from "./types";

/**
 * Infestations 0.3.2 on Main. `/lure leave` has no permission node, so every
 * player can use it. `/infestation` (alias `/infestations`) is op-only and not
 * listed.
 */
export const infestationsCommands: WikiCommandSet = {
  system: "Infestations",
  href: "/wiki/infestations",
  commands: [
    {
      command: "/lure leave",
      description: "Gives up the Lure fight you joined, so leaving the province no longer hurts you.",
    },
  ],
};

export const infestationsSection: WikiSection = {
  nav: {
    href: "/wiki/infestations",
    label: "Infestations",
    category: "combat",
    blurb: "Bog provinces overrun by monsters, and how to clear one with a Lure.",
  },
  commands: infestationsCommands,
};
