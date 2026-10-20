import type { CommandRow, WikiCommandSet, WikiSection } from "./types";

// ---------- Simple Factions ----------

/** One page of the Factions guide. The hub links each one; every subpage links back. */
export type FactionGuidePage = { href: string; label: string; blurb: string };

export const factionGuidePages: FactionGuidePage[] = [
  {
    href: "/wiki/factions/getting-started",
    label: "Starting a faction",
    blurb: "Create a faction, set a capital and bank, invite members and find your way around the menu.",
  },
  {
    href: "/wiki/factions/land",
    label: "Land, titles and prestige",
    blurb: "Claim provinces, form counties up to empires, and grow the prestige that makes it all possible.",
  },
  {
    href: "/wiki/factions/government",
    label: "Government and stability",
    blurb: "Laws, councils, elections, stability, movements and civil war.",
  },
  {
    href: "/wiki/factions/diplomacy",
    label: "Diplomacy",
    blurb: "Allies, vassals, trade deals, embargoes, truces and diplomatic capacity.",
  },
  {
    href: "/wiki/factions/coalitions",
    label: "Coalitions",
    blurb: "Smaller factions band together against one dominant realm and call each other into its wars.",
  },
  {
    href: "/wiki/factions/war",
    label: "War",
    blurb: "Declare with a war code, pick demands, vote on battle times and fight the campaign.",
  },
  {
    href: "/wiki/factions/money",
    label: "Money and upkeep",
    blurb: "The faction bank, the daily payout, taxes, loans and what happens when you go broke.",
  },
  {
    href: "/wiki/factions/guilds",
    label: "Guilds and trade",
    blurb: "Guilds inside a faction, branches, resource nodes and how trade spreads across the map.",
  },
  {
    href: "/wiki/factions/installations",
    label: "Installations and vehicles",
    blurb: "Forts, ports, airports and train stations, and keeping faction vehicles paid for.",
  },
  {
    href: "/wiki/factions/mercenaries",
    label: "Mercenaries",
    blurb: "Found a mercenary company, sign contracts and hire soldiers for your wars.",
  },
];

// ---------- Land and titles ----------

export type FactionTier = { tier: string; prestige: string; form: string };

/** Live `tiers.yml`. Only the highest title a faction holds adds its prestige. */
export const factionTiers: FactionTier[] = [
  { tier: "Province", prestige: "+10 per province", form: "Claim land" },
  { tier: "County", prestige: "+80", form: "5 provinces outside any county" },
  { tier: "Duchy", prestige: "+200", form: "4 counties not already in a duchy" },
  { tier: "Kingdom", prestige: "+600", form: "4 duchies not already in a kingdom" },
  { tier: "Empire", prestige: "+1,000", form: "3 kingdoms not already in an empire" },
];

export type FactionRank = { rank: string; prestige: string; ofTop: string; deJure: string; effect: string };

/** Live `ranks.yml`. */
export const factionRanks: FactionRank[] = [
  { rank: "Obscure Faction", prestige: "0", ofTop: "0%", deJure: "90%", effect: "-20% diplomatic capacity" },
  { rank: "Influential Faction", prestige: "350", ofTop: "40%", deJure: "85%", effect: "-10% diplomatic capacity" },
  { rank: "Powerful Faction", prestige: "800", ofTop: "55%", deJure: "80%", effect: "None" },
  { rank: "Glorious Faction", prestige: "1,500", ofTop: "75%", deJure: "75%", effect: "+5% diplomatic capacity" },
  {
    rank: "Legendary Faction",
    prestige: "5,000",
    ofTop: "85%",
    deJure: "60%",
    effect: "+10% diplomatic capacity, +5% node speed",
  },
];

// ---------- Government ----------

export type FactionGovernment = { name: string; council: string; legitimacy: string };

export const factionGovernments: FactionGovernment[] = [
  { name: "Community", council: "None. The leader decides.", legitimacy: "Very high" },
  { name: "Autocracy", council: "None. The leader decides.", legitimacy: "Very low" },
  { name: "Oligarchy", council: "The leader appoints the seats.", legitimacy: "Low" },
  { name: "Plutocracy", council: "Seats go to the richest members.", legitimacy: "Low" },
  { name: "Democracy", council: "Seats are elected.", legitimacy: "High" },
];

export type FactionLawGroup = { group: string; options: string; controls: string };

export const factionLawGroups: FactionLawGroup[] = [
  {
    group: "Government",
    options: "Community, Autocracy, Oligarchy, Plutocracy, Democracy",
    controls: "Whether there is a council and how its seats are filled.",
  },
  { group: "Leadership", options: "Fixed, Elected", controls: "Whether the leader is chosen by election." },
  {
    group: "Council Size",
    options: "Personal Advisors (2), Small (4), Medium (6), Large (8)",
    controls: "How many council seats there are.",
  },
  {
    group: "Citizen Tax",
    options: "None, Low (5-10%), Medium (10-25%), High (25-60%)",
    controls: "Tax taken from members' earnings.",
  },
  {
    group: "Guild Tax",
    options: "None, Low (5-10%), Medium (10-25%), High (25-60%)",
    controls: "Tax on guild income, plus a matching dividend tax.",
  },
  {
    group: "Vassal Tax",
    options: "None, Low (5-10%), Medium (10-20%), High (20-35%)",
    controls: "Tax your vassals pay you.",
  },
  {
    group: "Economy",
    options: "Decentralized, Free Trade, Mercantilism, Protectionism, Isolationism",
    controls: "Tariffs and how open you are to foreign guilds.",
  },
  {
    group: "Military",
    options: "Decentralized, Levy Focus, Centralized",
    controls: "Free regiments, army upkeep and vassal levies.",
  },
  {
    group: "Vassalage",
    options: "None, Inclusive, Extractive",
    controls: "Whether you can have vassals and how hard you lean on them.",
  },
  {
    group: "Borders",
    options: "Closed, Open",
    controls: "Whether guilds can recruit players from outside the faction.",
  },
  {
    group: "Repression and Favouring",
    options: "Allowed or not",
    controls: "Whether you can boost or punish specific guilds and vassals.",
  },
  {
    group: "Assembly",
    options: "None, Right to Assembly, State Crackdowns",
    controls: "When you can order a movement to disband.",
  },
];

export type FactionStabilityBand = { range: string; status: string; tax: string; note: string };

export const factionStabilityBands: FactionStabilityBand[] = [
  { range: "75 to 100", status: "Stable", tax: "100%", note: "No problems." },
  { range: "60 to 74", status: "Strained", tax: "100%", note: "Small penalties start." },
  { range: "40 to 59", status: "Struggling", tax: "75%", note: "Weaker admin power and diplomacy." },
  { range: "20 to 39", status: "Failing", tax: "50%", note: "Heavy penalties." },
  { range: "1 to 19", status: "Collapsing", tax: "50%", note: "Cannot declare war or form titles." },
  { range: "0", status: "Failed", tax: "50%", note: "Cannot declare war or form titles." },
];

// ---------- Diplomacy ----------

export type FactionRelation = { name: string; what: string; agree: string; ends: string };

export const factionRelations: FactionRelation[] = [
  {
    name: "Ally",
    what: "Cannot declare war on each other. Can be called into each other's wars. Allied members can use ally-shared vehicles.",
    agree: "Both, with opinion of 40+ both ways and neither at war",
    ends: "Either side changes the relation",
  },
  {
    name: "Rival",
    what: "Marks a rival. Raises your diplomatic capacity, more so if they are stronger.",
    agree: "You alone, with opinion of -10 or lower",
    ends: "You change it",
  },
  {
    name: "Subject (vassal)",
    what: "The vassal pays vassal tax, sends levies and a share of its prestige, and fights in its liege's wars.",
    agree: "Both",
    ends: "Only the liege can release it",
  },
  {
    name: "Tributary",
    what: "The tributary pays 10% of its taxable income to the other faction.",
    agree: "Both",
    ends: "Only the receiving side",
  },
  {
    name: "Trade Agreement",
    what: "Both sides' guilds get +15% trade power and +5% production in each other's land, and full use of each other's installations.",
    agree: "Both",
    ends: "Either side",
  },
  {
    name: "Unequal Treaty",
    what: "A lopsided trade deal: the leader gets the bigger bonus and full installation use, the subject gets less.",
    agree: "Both",
    ends: "Only the leading side",
  },
  {
    name: "Embargo",
    what: "Their guilds lose 95% of trade and production in your land. Installations close both ways and your members' shops refuse them.",
    agree: "You alone",
    ends: "You lift it",
  },
  {
    name: "Non-Aggression Pact",
    what: "Neither side can declare war on the other.",
    agree: "Both",
    ends: "Either side, instantly",
  },
];

export type FactionVassalType = { type: string; levy: string; perk: string };

export const factionVassalTypes: FactionVassalType[] = [
  { type: "Subject", levy: "25%", perk: "The standard vassal." },
  {
    type: "Integrated Subject",
    levy: "50%",
    perk: "Pays more tax, cheaper army. Given to guilds raised into factions.",
  },
  { type: "March", levy: "50%", perk: "Pays half the tax, half the army upkeep. One per liege." },
  { type: "Mercantile", levy: "5%", perk: "Pays 50% more tax, faster resource nodes." },
  {
    type: "Palatinate",
    levy: "10%",
    perk: "Pays less tax, gives 20% of its prestige, both sides gain diplomatic capacity. One per liege.",
  },
];

// ---------- War ----------

export type FactionWarGoal = { goal: string; win: string };

export const factionWarGoals: FactionWarGoal[] = [
  { goal: "Tributary", win: "The loser becomes your tributary." },
  { goal: "Subjugate", win: "The loser becomes your vassal (subject, march, mercantile or palatinate)." },
  { goal: "Transfer Subject", win: "One of the loser's vassals becomes yours." },
  {
    goal: "De Jure Annex",
    win: "You take the provinces of a title you hold or have land in. The loser keeps its settlements and the roads between them.",
  },
  { goal: "Usurp", win: "You take the loser's highest title and its vassals. The loser becomes your vassal." },
  { goal: "Open Market", win: "The loser is forced into Free Trade and loses 25 stability." },
  { goal: "Change Government", win: "You set the loser's government and leadership laws. It loses 50 stability." },
  {
    goal: "Pillage",
    win: "One battle at a settlement within 3 provinces (or by sea). You loot 10 days of its guilds' trade income.",
  },
];

export type FactionWarDay = { time: string; what: string };

export const factionWarDay: FactionWarDay[] = [
  { time: "12:00", what: "Deadline for the winner of the last battle to choose Push or Hold." },
  { time: "16:00", what: "Battle time vote closes. Installations, retreats and autoresolve offers lock." },
  { time: "19:00 to 21:00", what: "Raid window for the attacking side." },
  { time: "20:00", what: "Warband sign-up opens." },
  { time: "21:00, 22:00 or 23:00", what: "The battle starts, at the hour that won the vote." },
];

export type FactionRegiment = { type: string; upkeep: string; build: string; role: string };

export const factionRegiments: FactionRegiment[] = [
  { type: "Professional", upkeep: "6", build: "12 hours", role: "Attacks and defends. Needs a law that allows it." },
  { type: "Militia", upkeep: "2", build: "6 hours", role: "Defends your own provinces only." },
  { type: "Field Artillery", upkeep: "6", build: "6 hours", role: "Each slot lets you keep one field gun." },
  { type: "Levy", upkeep: "0", build: "Instant", role: "Sent by your vassals. Attacks and defends." },
];

// ---------- Installations and vehicles ----------

export type FactionInstallation = { type: string; upkeep: string; build: string; holds: string };

/** Live `installations.yml`. Every installation covers an 80-block radius. */
export const factionInstallations: FactionInstallation[] = [
  { type: "Fort", upkeep: "50", build: "5 days", holds: "8 static emplacements, 2 land vehicles" },
  { type: "Port", upkeep: "20", build: "3 days", holds: "8 ships" },
  { type: "Airport", upkeep: "35", build: "3 days", holds: "10 aircraft" },
  { type: "Train station (level 1)", upkeep: "5", build: "3 days", holds: "2 static emplacements" },
  { type: "Train station (level 2)", upkeep: "35", build: "3 days", holds: "3 static emplacements" },
  { type: "Train station (level 3)", upkeep: "100", build: "5 days", holds: "4 static emplacements" },
];

export type FactionVehicleUpkeep = { group: string; vehicles: string };

/** Live `vehicles.yml`, denars per day. */
export const factionVehicleUpkeep: FactionVehicleUpkeep[] = [
  { group: "Land", vehicles: "Wooden cart 0, horse cart 1, small car 3" },
  { group: "Trains", vehicles: "Locomotive 2, every car 1" },
  { group: "Ships", vehicles: "Gunboat 2, sloop 4, torpedo boat 5, ironclad 8, cruiser 12" },
  { group: "Aircraft", vehicles: "Monoplane 3, cloudskimmer 5, biplane 6, bomber 8, gyrobomber 12, behemoth 20" },
  { group: "Guns", vehicles: "Field artillery 1, AA turret 1, fixed artillery 2, anti-air 2" },
];

// ---------- Commands ----------

export const factionStartCommands: CommandRow[] = [
  { command: "/faction menu", description: "Opens your faction's menu.", notes: "You must be in a faction." },
  { command: "/faction list", description: "Lists every faction, ranked by prestige, wealth or members." },
  {
    command: "/faction create <name>",
    description: "Founds a new faction with you as leader.",
    notes: "You must be playing a character and not be in a faction. Use _ for spaces.",
  },
  {
    command: "/faction invite <player>",
    description: "Invites an online player.",
    notes: "Leader only. 64 members at most.",
  },
  {
    command: "/faction join [faction]",
    description: "Accepts a faction invite.",
    notes: "No name needed if you have only one invite. You can also click Accept in chat.",
  },
  {
    command: "/faction decline [faction]",
    description: "Turns down a faction invite, or a diplomacy, war or vehicle request.",
  },
  {
    command: "/faction accept",
    description: "Accepts the request waiting for you: diplomacy, call to arms, vehicle transfer and more.",
    notes: "Requests last 60 seconds.",
  },
  {
    command: "/faction leave",
    description: "Leaves your faction.",
    notes: "The leader must hand over or delete instead. Guild members use /guild leave.",
  },
  {
    command: "/faction kick <player>",
    description: "Removes a member.",
    notes: "Leader only. Cannot kick members of other guilds.",
  },
  {
    command: "/faction setleader <player>",
    description: "Hands leadership to another member.",
    notes: "Leader only. Not possible when the leader is elected.",
  },
  {
    command: "/faction delete <faction>",
    description: "Disbands your faction.",
    notes: "Leader only. The bank must be empty, with no debt and no loans.",
  },
  { command: "/faction rename <name>", description: "Renames the faction.", notes: "Leader only." },
  {
    command: "/faction setbanner",
    description: "Uses the banner in your hand as the faction banner.",
    notes: "Leader only.",
  },
  {
    command: "/faction setcolour <R,G,B>",
    description: "Sets your colour on the web map.",
    notes: "Leader only. Each colour can only be used by one faction.",
  },
  {
    command: "/faction setrulertitle <title>",
    description: 'Sets your ruler\'s title, for example "King".',
    notes: "Leader only.",
  },
  {
    command: "/faction setrulingsystem <text>",
    description: "Sets the ruling system shown on your faction.",
    notes: "Leader only. A label only: it does not change your laws.",
  },
  { command: "/faction setculture <culture>", description: "Sets your culture label.", notes: "Leader only." },
  { command: "/faction setreligion <religion>", description: "Sets your religion label.", notes: "Leader only." },
];

export const factionLandCommands: CommandRow[] = [
  {
    command: "/faction setcapital <name>",
    description: "Founds your capital in the province you stand in, or moves or renames it.",
    notes:
      "Leader only. The first capital claims the province for free. Moving it after the first time costs 100 denars.",
  },
  {
    command: "/faction claim",
    description: "Claims the province you stand in.",
    notes: "Leader only. Needs a capital, a border with your land and enough prestige.",
  },
  {
    command: "/faction unclaim",
    description: "Gives up the province you stand in.",
    notes: "Leader only. Not your capital. Land cut off from your capital is lost too.",
  },
];

export const factionGovernmentCommands: CommandRow[] = [
  {
    command: "/faction positions",
    description: "Shows your faction's offices, including the Spymaster.",
  },
  {
    command: "/faction spymaster <player>",
    description: "Appoints a Spymaster.",
    notes: "Leader only. The player must be online. Wait 2 days between appointments.",
  },
  { command: "/faction spymaster remove", description: "Removes the Spymaster.", notes: "Leader only." },
  {
    command: "/faction spymaster share <overlord|vassals|allies> <tier>",
    description: "Shares your intelligence with your overlord, vassals or allies.",
    notes: "Spymaster only.",
  },
];

export const factionMoneyCommands: CommandRow[] = [
  {
    command: "/faction setbank",
    description: "Makes the chunk you stand in your faction bank.",
    notes: "Leader only. Must be in your capital province.",
  },
  {
    command: "/faction deposit <amount>",
    description: "Puts denars from your pouch into the faction bank.",
    notes: "Any member, standing in the bank chunk.",
  },
  {
    command: "/faction withdraw <amount>",
    description: "Takes denars from the faction bank into your pouch.",
    notes: "Leader only, standing in the bank chunk.",
  },
  {
    command: "/ledger",
    description: "Shows your own money for today: earnings, dividends, wages, tax and vehicle upkeep.",
    notes: "Resets at the daily payout.",
  },
];

export const factionGuildCommands: CommandRow[] = [
  { command: "/guild menu", description: "Opens your guild's menu.", notes: "You must be in a guild." },
  { command: "/guild list", description: "Lists guilds." },
  {
    command: "/guild create <name>",
    description: "Creates a guild inside your faction, with you as its leader.",
    notes: "Not the faction leader, and not already in a guild.",
  },
  {
    command: "/guild invite <player>",
    description: "Invites a player to your guild.",
    notes: "Guild leader only. Under Closed Borders only faction members can be invited.",
  },
  {
    command: "/guild join [guild]",
    description: "Accepts a guild invite.",
    notes: "No name needed if you have only one invite.",
  },
  { command: "/guild decline <guild>", description: "Turns down a guild invite." },
  { command: "/guild leave", description: "Leaves your guild.", notes: "The guild leader must delete it instead." },
  { command: "/guild kick <player>", description: "Removes a guild member.", notes: "Guild leader only." },
  {
    command: "/guild setleader <player>",
    description: "Hands the guild to another member.",
    notes: "Guild leader only.",
  },
  {
    command: "/guild delete <guild>",
    description: "Disbands your guild.",
    notes: "Guild leader only. The bank must be empty, with no debt and no loans.",
  },
  { command: "/guild rename <name>", description: "Renames the guild.", notes: "Guild leader only." },
  {
    command: "/guild setcapital [name]",
    description: "Sets your guild's capital, where its trade starts from.",
    notes: "Guild leader only. Must be in your faction's land. Name a new settlement if there is none.",
  },
  {
    command: "/guild setbanner",
    description: "Uses the banner in your hand as the guild banner.",
    notes: "Guild leader only.",
  },
  { command: "/guild setcolour <R,G,B>", description: "Sets the guild's colour.", notes: "Guild leader only." },
  {
    command: "/guild setbank",
    description: "Makes the chunk you stand in your guild bank.",
    notes: "Guild leader only.",
  },
  {
    command: "/guild deposit <amount>",
    description: "Puts denars into the guild bank.",
    notes: "Any guild member, standing in the bank chunk.",
  },
  {
    command: "/guild withdraw <amount>",
    description: "Takes denars from the guild bank.",
    notes: "Guild leader only, standing in the bank chunk.",
  },
  {
    command: "/guild appoint <guild> <player>",
    description: "Offers the leadership of a leaderless guild to a player.",
    notes: "Faction leader only.",
  },
  {
    command: "/guild lead <guild>",
    description: "Accepts the leadership of a leaderless guild you were offered.",
  },
];

export const factionInstallationCommands: CommandRow[] = [
  {
    command: "/faction construct <fort|port|airport|train_station> <name>",
    description: "Starts building an installation in the province you stand in.",
    notes: "Leader only. Starts at once with no confirmation. One build at a time.",
  },
  {
    command: "/faction upgrade <id>",
    description: "Upgrades a train station to the next level.",
    notes: "Leader only.",
  },
  {
    command: "/faction deconstruct [id]",
    description: "Demolishes an installation, or cancels a build. Without an id it opens the installations list.",
    notes: "Leader only. Asks you to confirm.",
  },
  {
    command: "/faction vehicle transfer <id|pool>",
    aliases: ["/faction transfervehicle <id>"],
    description: "Berths a vehicle at an installation or in the faction pool. Right-click the vehicle next.",
    notes: "Leader only. Another player's vehicle needs its owner nearby to accept.",
  },
  {
    command: "/faction vehicle take",
    description: "Takes a faction vehicle as your own. Right-click the vehicle next.",
    notes: "Leader only.",
  },
  {
    command: "/faction vehicle give <player>",
    description: "Gives a faction vehicle to a player.",
    notes: "Leader only. The player accepts with /faction accept.",
  },
  {
    command: "/faction vehicle handover <player>",
    description: "Hands one of your own vehicles to another player.",
    notes: "The player accepts with /faction accept. Not during a battle.",
  },
  {
    command: "/faction vehicle maintenance pay bank",
    description: "Pays one day of a vehicle's upkeep from your personal bank. Right-click the vehicle next.",
  },
  {
    command: "/faction vehicle maintenance pay",
    description: "Pays one day of a vehicle's upkeep from your pouch. Right-click the vehicle next.",
    notes: "Leader only.",
  },
  {
    command: "/faction findvehicles <id>",
    description: "Lists the vehicles berthed at an installation, with coordinates.",
    notes: "Leader only.",
  },
];

export const factionWarCommands: CommandRow[] = [
  { command: "/war list", description: "Lists active wars. Click one to see both sides, demands and the campaign." },
  { command: "/warband list", description: "Lists warbands, including your faction's war warband." },
  {
    command: "/warband join <warband>",
    description: "Joins a warband. This is how you sign up for a war battle.",
    notes: "Your first sign-up ties your account to that side for the whole war.",
  },
  { command: "/warband create <name>", description: "Creates your own warband. It starts invite-only." },
  { command: "/warband invite <player>", description: "Invites a player.", notes: "Warband leader only." },
  {
    command: "/warband toggleopen",
    description: "Switches between open joining and invite-only.",
    notes: "Warband leader only.",
  },
  { command: "/warband kick <player>", description: "Removes a member.", notes: "Warband leader only." },
  {
    command: "/warband setleader <player>",
    description: "Hands the warband to another member.",
    notes: "Warband leader only.",
  },
  {
    command: "/warband leave",
    description: "Leaves your warband.",
    notes: "If you leave during a battle you cannot rejoin it.",
  },
  {
    command: "/warband delete <warband>",
    description: "Disbands your warband.",
    notes: "Warband leader only. Faction war warbands cannot be deleted.",
  },
  {
    command: "/warband retreat",
    description: "Retreats your warband from a battle. The other side wins.",
    notes: "Warband leader only, 20 minutes or more into the battle.",
  },
  {
    command: "/raid join <raid>",
    description: "Joins your side's raid during its 60-second muster.",
    notes: "Attacking side only.",
  },
  {
    command: "/battle list",
    description: "Lists battles outside of wars that your warband can join.",
    notes: "Warband leader only.",
  },
  {
    command: "/battle join <battle> <attacker|defender>",
    description: "Signs your warband up for a battle outside of wars.",
    notes: "Warband leader only. War battles use /warband join instead.",
  },
];

export const factionMercenaryCommands: CommandRow[] = [
  {
    command: "/company found <name>",
    description: "Founds a mercenary company for your guild. Costs 100 denars and takes 24 hours.",
    notes: "Guild leader with the mercenary trait. The guild needs a bank.",
  },
  {
    command: "/company invite <player>",
    description: "Offers a player a place in the company.",
    notes: "Guild leader only. The player needs the mercenary trait.",
  },
  {
    command: "/company accept",
    aliases: ["/company decline"],
    description: "Joins, or turns down, a company that invited you.",
  },
  {
    command: "/company kick <player>",
    description: "Dismisses a mercenary.",
    notes: "Guild leader only, when every slot is filled.",
  },
  {
    command: "/company expand",
    description: "Adds a slot after 24 hours.",
    notes: "Guild leader only, when every slot is filled.",
  },
  {
    command: "/company draft",
    description: "Gives you a contract book to fill in and sign.",
    notes: "Guild leader only.",
  },
  {
    command: "/company offer <faction>",
    description: "Sends the signed contract to a faction.",
    notes: "Guild leader only, holding the contract.",
  },
  { command: "/company contracts", description: "Opens the company's contracts.", notes: "Host guild members." },
  { command: "/mercenaries", description: "Opens the mercenary hiring hall." },
  { command: "/mercenaries list", description: "Lists companies in chat, best reputation first." },
  {
    command: "/mercenaries hire <company>",
    description: "Checks whether your faction can sign with a company. It does not hire.",
  },
];

/**
 * Coalition commands from the coalitions design. They are shown on the
 * coalitions page only and are not registered in the global command index.
 */
export const factionCoalitionCommands: CommandRow[] = [
  {
    command: "/coalition create <name> <target>",
    description: "Creates a coalition against a target, with your faction as its leader.",
    notes: "Faction leader of an independent faction that is in no coalition.",
  },
  { command: "/coalition menu", description: "Opens your coalition's menu." },
  { command: "/coalition list", description: "Shows every coalition." },
  { command: "/coalition invite <faction>", description: "Invites a faction.", notes: "Coalition leader only." },
  {
    command: "/coalition join <coalition>",
    description: "Accepts an invite.",
    notes: "Faction leader. Invites last 7 days.",
  },
  { command: "/coalition leave", description: "Leaves the coalition.", notes: "Faction leader." },
  { command: "/coalition kick <faction>", description: "Removes a member.", notes: "Coalition leader only." },
  {
    command: "/coalition leader <faction>",
    description: "Hands leadership to another member.",
    notes: "Coalition leader only.",
  },
  {
    command: "/coalition target <faction>",
    description: "Picks a new target after the old one is lost.",
    notes: "Coalition leader only, during the 7-day countdown.",
  },
  {
    command: "/coalition setbanner",
    aliases: ["/coalition resetbanner"],
    description: "Uses the banner in your hand, or goes back to the leader's faction banner.",
    notes: "Coalition leader only.",
  },
  {
    command: "/coalition offensive",
    description: "Enter a coalition code from staff to make the coalition offensive.",
    notes: "Coalition leader only.",
  },
  {
    command: "/coalition disband",
    description: "Disbands the coalition.",
    notes: "Coalition leader only. Not while a coalition war is running.",
  },
];

export const factionsCommands: WikiCommandSet = {
  system: "Simple Factions",
  href: "/wiki/factions",
  commands: [
    ...factionStartCommands,
    ...factionLandCommands,
    ...factionGovernmentCommands,
    ...factionMoneyCommands,
    ...factionGuildCommands,
    ...factionInstallationCommands,
    ...factionWarCommands,
    ...factionMercenaryCommands,
  ],
};

export const factionsSection: WikiSection = {
  nav: {
    href: "/wiki/factions",
    label: "Factions",
    category: "social",
    blurb: "Found a nation, claim land, run a government, make allies and fight wars over territory.",
  },
  commands: factionsCommands,
};
