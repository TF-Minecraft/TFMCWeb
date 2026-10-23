import { T } from "./helpers";
import { stationRecipe } from "./station-recipes";
import type { InstrumentInfo, InstrumentKey, Recipe, WikiCommandSet, WikiSection } from "./types";

// ---------- Musical Instruments ----------

/**
 * The nine playable instruments in documentation order, from the authoritative
 * server `instrument-station.yml`, via `data/generated/stationRecipes.ts`.
 * Sharing these recipes keeps this page and the Instrument Station page in sync;
 * registration happens once in `stationsSection`.
 */
export const instrumentRecipes: Recipe[] = [
  "flute",
  "lute",
  "vielle",
  "trumpet",
  "celtic-harp",
  "kalimba",
  "dulcimer",
  "accordion",
  "bagpipe",
].map((slug) => stationRecipe(`gen-instrument-station-${slug}`));

/** The craft for one instrument, by its `InstrumentInfo.slug`. */
export function getInstrumentRecipe(slug: string): Recipe | undefined {
  return instrumentRecipes.find((r) => r.key === `gen-instrument-station-${slug}`);
}

// ---------- Instrument keyboards ----------

const NOTE_LETTERS = ["c", "d", "e", "f", "g", "a", "b", "c"];

function instrumentKeys(folder: string, mode: "chord" | "octave"): { row1: InstrumentKey[]; row2: InstrumentKey[] } {
  const S = (num: number, letter: string, suffix: "single" | "chord") =>
    `/wiki/sounds/instruments/${folder}/${folder}_${num}${letter}_${suffix}.ogg`;

  const row1 = NOTE_LETTERS.map((letter, i) => ({
    num: i + 1,
    note: letter.toUpperCase(),
    sound: S(i + 1, letter, "single"),
  }));

  const row2 =
    mode === "chord"
      ? NOTE_LETTERS.map((letter, i) => ({
          num: i + 1,
          note: letter.toUpperCase(),
          sound: S(i + 1, letter, "chord"),
        }))
      : NOTE_LETTERS.map((letter, i) => ({
          num: i + 9,
          note: letter.toUpperCase(),
          sound: S(i + 9, letter, "single"),
        }));

  return { row1, row2 };
}

const instrumentDefs: Array<{ slug: string; name: string; folder: string; mode: "chord" | "octave" }> = [
  { slug: "flute", name: "Flute", folder: "flute", mode: "octave" },
  { slug: "lute", name: "Lute", folder: "lute", mode: "chord" },
  { slug: "vielle", name: "Vielle", folder: "vielle", mode: "chord" },
  { slug: "trumpet", name: "Trumpet", folder: "trumpet", mode: "octave" },
  { slug: "celtic-harp", name: "Celtic Harp", folder: "celtic_harp", mode: "chord" },
  { slug: "kalimba", name: "Kalimba", folder: "kalimba", mode: "chord" },
  { slug: "dulcimer", name: "Dulcimer", folder: "dulcimer", mode: "chord" },
  { slug: "accordion", name: "Accordion", folder: "accordion", mode: "chord" },
  { slug: "bagpipe", name: "Bagpipe", folder: "bagpipe", mode: "octave" },
];

export const instruments: InstrumentInfo[] = instrumentDefs.map((d) => ({
  slug: d.slug,
  name: d.name,
  icon: T(`instruments/${d.folder}.png`),
  mode: d.mode,
  ...instrumentKeys(d.folder, d.mode),
}));

export function getInstrumentBySlug(slug: string): InstrumentInfo | undefined {
  return instruments.find((i) => i.slug === slug);
}

/**
 * MusicalInstruments 3.4.1 on Main. Every player command below defaults to true
 * (`instruments.use`, `instruments.record`, `instruments.copy`). `/music studio`,
 * `/instruments give` and `/instruments reload` are staff only.
 */
export const instrumentCommands: WikiCommandSet = {
  system: "Musical Instruments",
  href: "/wiki/musical-instruments",
  commands: [
    {
      command: "/instruments play",
      description: "Opens the on-screen keyboard for the instrument you are holding.",
      notes: "Right-clicking with the instrument does the same.",
    },
    {
      command: "/instruments keybinds",
      description: "Lists the notes and chords on each hotbar key for the instrument in your off-hand.",
    },
    {
      command: "/instruments list",
      description: "Lists every instrument.",
    },
    {
      command: "/music help",
      aliases: ["/recording help"],
      description: "Lists the recording commands. They do the same as the buttons in the studio.",
    },
    {
      command: "/music new <title>",
      description: "Starts a new song.",
    },
    {
      command: "/music projects",
      aliases: ["/music open <id>"],
      description: "Lists your songs, or opens one of them.",
    },
    {
      command: "/music record <track>",
      description: "Records a take on track 1 to 4. Stop with /music stop.",
    },
    {
      command: "/music preview take",
      description: "Plays back your last take with the other tracks.",
    },
    {
      command: "/music keep",
      aliases: ["/music discard"],
      description: "Keeps or throws away your last take.",
    },
    {
      command: "/music blank",
      description: "Turns a music disc from your inventory into a blank recording disc.",
    },
    {
      command: "/music publish",
      description: "Records the whole song onto the blank disc in your main hand.",
    },
    {
      command: "/music copy",
      description: "Copies the recorded disc in your off-hand onto a blank disc.",
    },
  ],
};

export const instrumentsSection: WikiSection = {
  nav: {
    href: "/wiki/musical-instruments",
    label: "Musical Instruments",
    category: "social",
    blurb: "Play nine instruments from your hotbar or an on-screen keyboard, and record songs onto music discs.",
  },
  // `instrumentRecipes` are server recipes registered by `stationsSection`;
  // listing them again here would put them in the recipe index twice.
  commands: instrumentCommands,
};
