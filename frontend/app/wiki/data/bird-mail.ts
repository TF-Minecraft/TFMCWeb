import type { WikiCommandSet, WikiSection } from "./types";

// ---------- BirdMessenger ----------

export const birdMailCommands: WikiCommandSet = {
  system: "BirdMessenger",
  href: "/wiki/bird-mail",
  commands: [],
};

export const birdMailSection: WikiSection = {
  nav: {
    href: "/wiki/bird-mail",
    label: "Bird Mail",
    category: "character",
    blurb: "Send a Letter from a bird mailbox to another character, even one who is offline.",
  },
  commands: birdMailCommands,
};
