import type { WikiCommandSet, WikiSection } from "./types";

// SimpleFactions 4.14.3 with Main's configs. Staff commands (force*, admin, reload and so on),
// coalitions (off on Main) and the Spymaster's private sabotage are left out.

// ---------- Factions ----------

export type FactionTitle = { title: string; formedFrom: string; prestige: string };

/** Main's `tiers.yml`: what each title is formed from and the prestige it adds. */
export const factionTitles: FactionTitle[] = [
  { title: "County", formedFrom: "5 provinces outside any title", prestige: "80" },
  { title: "Duchy", formedFrom: "4 Counties", prestige: "200" },
  { title: "Kingdom", formedFrom: "4 Duchies", prestige: "600" },
  { title: "Empire", formedFrom: "3 Kingdoms", prestige: "1,000" },
];

export type FactionRank = { rank: string; prestige: string; share: string };

/** Main's `ranks.yml`: the prestige for each rank and the share of a title's provinces needed to claim it. */
export const factionRanks: FactionRank[] = [
  { rank: "Obscure", prestige: "0", share: "90%" },
  { rank: "Influential", prestige: "350", share: "85%" },
  { rank: "Powerful", prestige: "800", share: "80%" },
  { rank: "Glorious", prestige: "1,500", share: "75%" },
  { rank: "Legendary", prestige: "5,000", share: "60%" },
];

export const factionsCommands: WikiCommandSet = {
  system: "Factions",
  href: "/wiki/factions",
  commands: [
    { command: "/faction menu", description: "Opens your faction: government, laws, diplomacy, titles and more." },
    { command: "/faction list", description: "Lists every faction." },
    {
      command: "/faction create <name>",
      description: "Founds a faction with you as its leader.",
      notes: "Not while you are in a faction.",
    },
    {
      command: "/faction setcapital <name>",
      description: "Claims the province you stand in as your capital. Later, moves or renames the capital.",
      notes: "Leader. Every move after the first costs 100 d from the faction bank.",
    },
    { command: "/faction claim", description: "Claims the province you stand in.", notes: "Leader." },
    {
      command: "/faction unclaim",
      description: "Gives up the province you stand in.",
      notes: "Leader. Not the capital.",
    },
    { command: "/faction invite <player>", description: "Invites a player to join.", notes: "Leader." },
    {
      command: "/faction join [name]",
      description: "Accepts an invite. You can also click Accept on the invite.",
    },
    {
      command: "/faction accept",
      aliases: ["/faction decline"],
      description: "Answers a request sent to you, such as an alliance offer or a vehicle handover.",
    },
    {
      command: "/faction leave",
      description: "Leaves your faction.",
      notes:
        "Leave any guild other than the main one first with /guild leave. A leader must hand over or delete the faction first.",
    },
    {
      command: "/faction kick <player>",
      description: "Removes a member.",
      notes: "Leader. Members of another guild must first be removed by its leader with /guild kick.",
    },
    {
      command: "/faction setleader <player>",
      description: "Hands the leadership to another member.",
      notes: "Leader. Not when the leader is elected.",
    },
    {
      command: "/faction delete <faction>",
      description: "Disbands your faction.",
      notes: "Leader. The bank must be empty, with no loans and no bankruptcy.",
    },
    {
      command: "/faction setbank",
      description: "Makes the chunk you stand in the faction bank.",
      notes: "Leader. It must be in your capital province.",
    },
    {
      command: "/faction deposit <amount>",
      description: "Pays money from your pouch into the faction bank.",
      notes: "At the faction bank.",
    },
    {
      command: "/faction withdraw <amount>",
      description: "Takes money from the faction bank into your pouch.",
      notes: "Leader, at the faction bank.",
    },
    { command: "/faction rename <name>", description: "Renames the faction.", notes: "Leader." },
    {
      command: "/faction setbanner",
      description: "Uses the banner in your hand as the faction banner.",
      notes: "Leader.",
    },
    {
      command: "/faction setcolour <R,G,B>",
      description: "Sets the faction's colour on the map.",
      notes: "Leader. Each colour can only be used by one faction.",
    },
    {
      command: "/faction setrulertitle <title>",
      aliases: ["/faction setrulingsystem", "/faction setculture", "/faction setreligion"],
      description: "Sets the ruler title, ruling system, culture or religion shown for your faction.",
      notes: "Leader. These are names only and change nothing else.",
    },
    { command: "/faction positions", description: "Shows your faction's offices and who holds them." },
    {
      command: "/faction espionage",
      description: "Opens the Spymaster's office.",
    },
    {
      command: "/faction spymaster <player>",
      aliases: ["/faction spymaster remove"],
      description: "Appoints or removes the Spymaster.",
      notes: "Leader.",
    },
    {
      command: "/faction spymaster share <overlord|vassals|allies> <tier>",
      description:
        "Lets that partner see your own military exactly, up to the quality you choose (rumours, broad, reliable or detailed). none stops sharing.",
      notes: "Spymaster.",
    },
    { command: "/ledger", description: "Shows your own money in and out each day: earnings, taxes and upkeep." },
  ],
};

export const factionsSection: WikiSection = {
  nav: {
    href: "/wiki/factions",
    label: "Factions",
    category: "social",
    blurb: "Join or found a faction, claim provinces, earn prestige and titles, and run its government.",
  },
  commands: factionsCommands,
};

// ---------- Guilds & Trade ----------

export type InstallationInfo = { type: string; upkeepPerDay: string; buildTime: string; slots: string };

/** Level-1 figures from Main's `installations.yml`. Train station levels 2 and 3 are on the page. */
export const installations: InstallationInfo[] = [
  { type: "Fort", upkeepPerDay: "30 d", buildTime: "5 days", slots: "8 emplacements, 2 land vehicles" },
  { type: "Port", upkeepPerDay: "15 d", buildTime: "3 days", slots: "8 ships" },
  { type: "Airport", upkeepPerDay: "20 d", buildTime: "3 days", slots: "10 aircraft" },
  { type: "Train station", upkeepPerDay: "5 d", buildTime: "3 days", slots: "2 emplacements" },
];

export const guildsCommands: WikiCommandSet = {
  system: "Guilds & Trade",
  href: "/wiki/guilds",
  commands: [
    { command: "/guild menu", description: "Opens your guild." },
    { command: "/guild list", description: "Lists guilds." },
    {
      command: "/guild create <name>",
      description: "Founds a guild inside your faction, with you as its leader.",
      notes: "Not for the faction leader, or if you already lead or belong to another guild.",
    },
    {
      command: "/guild invite <player>",
      description: "Invites a player to your guild.",
      notes: "Guild leader. Under Open Borders you can invite players from outside the faction.",
    },
    { command: "/guild join <name>", description: "Accepts a guild invite." },
    {
      command: "/guild leave",
      description: "Leaves your guild and puts you back in your faction's main guild.",
      notes: "A guild leader must delete the guild first. To leave the faction, use /faction leave.",
    },
    {
      command: "/guild decline <guild>",
      description: "Turns down a guild invite, or an offer to lead a guild.",
    },
    {
      command: "/guild kick <player>",
      description: "Removes a member, who goes back to your faction's main guild.",
      notes: "Guild leader.",
    },
    {
      command: "/guild appoint <guild> <character>",
      description: "Offers a guild whose leader has died to a living member of your faction.",
      notes: "Faction leader.",
    },
    { command: "/guild lead <guild>", description: "Accepts an offer to lead a guild." },
    { command: "/guild setleader <player>", description: "Hands the guild to another member.", notes: "Guild leader." },
    {
      command: "/guild delete <guild>",
      description: "Disbands your guild. Its members return to the faction's main guild.",
      notes: "Guild leader. The bank must be empty, with no loans and no bankruptcy.",
    },
    {
      command: "/guild setcapital [name]",
      description: "Makes the province you stand in the guild's capital, where its trade starts.",
      notes: "Guild leader, in your faction's land. Give a name if the province has no settlement yet.",
    },
    {
      command: "/guild setbank",
      description: "Makes the chunk you stand in the guild bank.",
      notes: "Guild leader. It must be in the guild's capital province.",
    },
    {
      command: "/guild deposit <amount>",
      description: "Pays money from your pouch into the guild bank.",
      notes: "At the guild bank.",
    },
    {
      command: "/guild withdraw <amount>",
      description: "Takes money from the guild bank into your pouch.",
      notes: "Guild leader, at the guild bank.",
    },
    {
      command: "/guild rename <name>",
      aliases: ["/guild setbanner", "/guild setcolour <R,G,B>"],
      description: "Renames the guild, or sets its banner from your hand or its colour.",
      notes: "Guild leader.",
    },
    {
      command: "/faction construct <fort|port|airport|train_station> <name>",
      description: "Starts building an installation in the province you stand in.",
      notes: "Faction leader. Starts at once, with no confirmation.",
    },
    {
      command: "/faction upgrade <installation>",
      description: "Starts building the next level of a train station.",
      notes: "Faction leader.",
    },
    {
      command: "/faction deconstruct [installation]",
      description: "Demolishes an installation, or cancels one being built.",
      notes: "Faction leader.",
    },
    {
      command: "/faction vehicle transfer <installation|pool>",
      description: "Berths a vehicle at an installation, or gives it to the faction's vehicle pool.",
      notes: "Faction leader. The owner must be close by and accept.",
    },
    {
      command: "/faction vehicle take",
      aliases: ["/faction vehicle give <player>"],
      description: "Takes a faction vehicle as your own, or gives it to a player.",
      notes: "Faction leader.",
    },
    {
      command: "/faction vehicle handover <player>",
      description: "Offers one of your own vehicles to another player.",
    },
    {
      command: "/faction vehicle maintenance pay [bank]",
      description: "Then right-click an unpaid vehicle to pay one day of its upkeep.",
      notes: "Anyone can use bank to pay from their own bank. Without bank, faction leaders pay from their pouch.",
    },
    {
      command: "/faction findvehicles <installation id>",
      description: "Lists the vehicles berthed at an installation and where they are.",
      notes: "Faction leader.",
    },
  ],
};

export const guildsSection: WikiSection = {
  nav: {
    href: "/wiki/guilds",
    label: "Guilds & Trade",
    category: "social",
    blurb: "Run a guild inside your faction, bank its money, build installations and pay vehicle upkeep.",
  },
  commands: guildsCommands,
};

// ---------- War & Mercenaries ----------

export type Regiment = { unit: string; upkeep: string; note: string };

/** Main's `regiments.yml`: upkeep is per slot per day. */
export const regiments: Regiment[] = [
  { unit: "Professional Army", upkeep: "6 d", note: "Attacks and defends." },
  {
    unit: "Field Artillery",
    upkeep: "6 d",
    note: "Each slot keeps one artillery piece in the faction's vehicle pool.",
  },
  { unit: "Militia", upkeep: "2 d", note: "Defends only." },
  { unit: "Levies", upkeep: "None", note: "Raised from your subjects." },
];

export const warCommands: WikiCommandSet = {
  system: "War & Mercenaries",
  href: "/wiki/war",
  commands: [
    { command: "/war list", description: "Shows the wars going on." },
    { command: "/warband list", description: "Lists warbands, including your side's war warband." },
    {
      command: "/warband join <warband>",
      description: "Joins a warband. On a battle day, this is how you sign up to fight.",
      notes: "War warbands open at 20:00 on battle day.",
    },
    { command: "/warband leave", description: "Leaves your warband." },
    {
      command: "/raid join <raid>",
      description: "Joins a raid while it musters.",
      notes: "Attackers only, within 60 seconds, and not while you are in a warband.",
    },
    {
      command: "/warband retreat",
      description: "Retreats from the battle, which counts as a loss.",
      notes: "Warband leader, after the first 20 minutes.",
    },
    { command: "/warband create <name>", description: "Creates your own warband for staff-run battles." },
    {
      command: "/warband invite <player>",
      aliases: ["/warband kick <player>", "/warband setleader <player>", "/warband toggleopen"],
      description: "Manages your warband: invites, removals, leader, and whether anyone can join.",
      notes: "Warband leader.",
    },
    { command: "/warband delete <warband>", description: "Disbands your warband.", notes: "Warband leader." },
    {
      command: "/battle list",
      aliases: ["/battle join <battle> <side>"],
      description: "Lists staff-run battles, or enters your warband into one.",
      notes: "Warband leader.",
    },
    {
      command: "/company found <name>",
      description: "Founds a mercenary company for your guild.",
      notes: "Guild leader with the Mercenary trait. Costs 100 d from the guild bank.",
    },
    {
      command: "/company invite <player>",
      aliases: ["/company kick <player>", "/company expand"],
      description: "Offers someone a place, dismisses a mercenary, or adds a place.",
      notes: "Company leader.",
    },
    {
      command: "/company accept",
      aliases: ["/company decline"],
      description: "Answers an offer to join a company.",
    },
    {
      command: "/company draft",
      description: "Gives you a contract book to fill in and sign.",
      notes: "Company leader.",
    },
    {
      command: "/company offer <faction>",
      description: "Sends the signed contract to a faction.",
      notes: "Company leader, holding the contract.",
    },
    { command: "/company contracts", description: "Shows your company's contracts." },
    { command: "/mercenaries", description: "Opens the mercenary market." },
    { command: "/mercenaries list", description: "Lists mercenary companies, best reputation first." },
    {
      command: "/mercenaries hire <company>",
      description: "Checks whether you can sign a contract with that company here.",
    },
  ],
};

export const warSection: WikiSection = {
  nav: {
    href: "/wiki/war",
    label: "War & Mercenaries",
    category: "social",
    blurb: "Declare war, fight scheduled battles and raids, keep regiments, and hire or run a mercenary company.",
  },
  commands: warCommands,
};
