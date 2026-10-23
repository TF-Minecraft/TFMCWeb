import { V, empty } from "./helpers";
import type { Recipe, WikiCommandSet, WikiSection } from "./types";

// ---------- BirdMessenger letters and bird mail ----------

export const letterRecipe: Recipe = {
  key: "craft-letter",
  title: "Letter",
  station: "Crafting Table",
  requirement: "None",
  ingredients: [
    { name: "Paper", qty: 1, texture: V("paper.png") },
    { name: "Paper", qty: 1, texture: V("paper.png") },
    empty,
    { name: "Paper", qty: 1, texture: V("paper.png") },
    { name: "Paper", qty: 1, texture: V("paper.png") },
    empty,
    empty,
    empty,
    empty,
  ],
  output: { name: "Letter", qty: 1, texture: "/wiki/textures/items/letters/letter.png" },
  note: "Write in the Letter and sign it to seal it.",
};

export const birdMailCommands: WikiCommandSet = {
  system: "Letters & Bird Mail",
  href: "/wiki/bird-mail",
  // Listing yourself as a recipient is /rpcharacter mail, registered on the Characters page.
  commands: [],
};

export const birdMailSection: WikiSection = {
  nav: {
    href: "/wiki/bird-mail",
    label: "Letters & Bird Mail",
    category: "character",
    blurb: "Write and seal letters, then send them by bird to any character, even one who is offline.",
  },
  recipes: [letterRecipe],
  commands: birdMailCommands,
};
