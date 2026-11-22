import type { WikiCommandSet, WikiSection } from "./types";

// ---------- Trial Rooms (TrialRooms 0.3.2 on Main) ----------
//
// Sources: EntranceManager, PlayerManager, SpawnerManager, ActiveSpawner,
// KeyService and ChestManager, plus Main's `plugins/TrialRooms`
// config, spawners and loot tables. The Unknown Key is MMOItems
// `m.loot.trial_key`, found in Arcane Caches (`geiger_counter/config.yml`,
// list `act_1`), gathering treasure (Gathering `categories.yml`) and
// infestation loot (Infestations `rewards.yml`). The entrance location, room names, key rarity weights and
// loot odds stay off the page. `/tr` is staff-only, so no player commands.

export const trialRoomsCommands: WikiCommandSet = {
  system: "Trial Rooms",
  href: "/wiki/trial-rooms",
  commands: [],
};

export const trialRoomsSection: WikiSection = {
  nav: {
    href: "/wiki/trial-rooms",
    label: "Trial Rooms",
    category: "combat",
    blurb: "Use an Unknown Key to enter a series of guarded rooms, clear their spawners and open their chests.",
  },
  commands: trialRoomsCommands,
};
