import type { WikiCommandSet, WikiSection } from "./types";

// ---------- Surgery and the Herborist Physician perk ----------

export const medicineCommands: WikiCommandSet = {
  system: "Medicine & Surgery",
  href: "/wiki/medicine",
  commands: [
    {
      command: "/surgery <player>",
      description: "Offers to operate on another player's healing injury.",
      notes: "Physician perk. The patient must be within 5 blocks, and both of you must be playing a character.",
    },
    {
      command: "/surgery accept",
      description: "Accepts a surgery offer and starts the operation.",
      notes: "Within 60 seconds of the offer.",
    },
    {
      command: "/surgery deny",
      description: "Turns down a surgery offer.",
    },
  ],
};

export const medicineSection: WikiSection = {
  nav: {
    href: "/wiki/medicine",
    label: "Medicine & Surgery",
    category: "character",
    blurb: "Become a physician, operate on healing injuries and make prosthetic limbs.",
  },
  commands: medicineCommands,
};
