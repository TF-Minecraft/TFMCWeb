import type { WikiCommandSet, WikiSection } from "./types";

// ---------- MMOCore classes, RPCharacters class picks, professions ----------

export type PathType = "Martial" | "Semi-caster" | "Full caster";

export type BaseClass = {
  id: string;
  name: string;
  lore: string;
  /** Mage and Musketeer have no subclasses and keep their own equipment. */
  equipment?: string;
  subclasses: string[];
};

/** The seven classes offered at creation and in /class (`MMOCore/classes/<id>.yml` on Main). */
export const baseClasses: BaseClass[] = [
  {
    id: "archer",
    name: "Archer",
    lore: "Deadly marksmen who deal steady damage from a distance and are good at keeping a safe position.",
    subclasses: ["ranger", "trapper", "arcane_archer"],
  },
  {
    id: "bard",
    name: "Bard",
    lore: "Charismatic musicians who channel mana through music to bless allies and slow enemies down.",
    subclasses: ["minstrel", "virtuoso", "siren"],
  },
  {
    id: "guardian",
    name: "Guardian",
    lore: "Unyielding defenders who draw attention, absorb damage and push enemies around the battlefield.",
    subclasses: ["juggernaut", "warden", "runeward"],
  },
  {
    id: "paladin",
    name: "Paladin",
    lore: "Resolute soldiers who strengthen themselves and protect others, as duellists or as support.",
    subclasses: ["crusader", "templar", "cleric"],
  },
  {
    id: "warrior",
    name: "Warrior",
    lore: "Mobile fighters who mix attacks and flexible skills to deal heavy damage at the front.",
    subclasses: ["berserker", "warlord", "spellblade"],
  },
  {
    id: "mage",
    name: "Mage",
    lore: "The hardest class. Mages build their own weapons from parts, cast spells from runes and are very expensive to gear.",
    equipment: "Mage Staffs, Mage Wands, Mage Blades, Mage Armour",
    subclasses: [],
  },
  {
    id: "musketeer",
    name: "Musketeer",
    lore: "Experts in guns and gadgets. They have no skills, but build firearms to order, many of which pierce armour.",
    equipment: "Pistols, Rifles, Shotguns, Rocket Launchers, Infantry Armour",
    subclasses: [],
  },
];

export type Skill = {
  name: string;
  /** Passives work on their own once slotted; everything else is a spell cast from the skill bar. */
  passive?: boolean;
  /** Always on, with no slot needed. */
  always?: boolean;
  description: string;
};

/** Skill text from Main's `MythicLib/skill/tfmc_*.yml`, without the level-scaled numbers. */
export const skills: Record<string, Skill> = {
  FOE_SENSE: {
    name: "Foe Sense",
    always: true,
    description: "Remembers who you trade hits with, so your group's heals, buffs, shields and cleanses skip them.",
  },
  DUEL_INSTINCT: {
    name: "Duel Instinct",
    always: true,
    description: "Remembers who you trade hits with, so Challenge can target them and your group's support skips them.",
  },
  // Archer
  STEADY_AIM: { name: "Steady Aim", passive: true, description: "Your arrows deal extra damage." },
  HUNTERS_MARK: {
    name: "Hunter's Mark",
    passive: true,
    description: "Your arrows make the target glow and slow it.",
  },
  FLEET_FOOTED: { name: "Fleet-Footed", passive: true, description: "Gain Speed II when an enemy comes close." },
  EVASION: { name: "Evasion", passive: true, description: "When an enemy hits you, leap back and gain Speed II." },
  FINISHER: { name: "Finisher", passive: true, description: "Your arrows deal extra damage to badly hurt enemies." },
  POISON_ARROW: {
    name: "Poison Arrow",
    description: "Your next arrow damages and poisons the target and leaves a poison trap where it lands.",
  },
  ARCHER_STEP: {
    name: "Archer Step",
    description: "Leap backwards and leave a snare that freezes the first one to step on it, friend or foe.",
  },
  TOTEM_MINE: {
    name: "Totem Mine",
    description: "Throw a mine. When an enemy sets it off, it burns, damages and slows everything near it.",
  },
  SEITHR_GLYPH: {
    name: "Seithr Glyph",
    description: "Draw a glyph on the ground. When someone steps on it, it goes off and freezes everyone on it.",
  },
  VENOM_TIPS: { name: "Venom Tips", passive: true, description: "Your arrows Wound the target." },
  CAMOUFLAGE: {
    name: "Camouflage",
    passive: true,
    description:
      "Hold crouch to vanish for a while, gear included. Standing up, attacking, shooting or being hit reveals you.",
  },
  ICE_SHARD: { name: "Ice Shard", description: "Fire a shard that slows the target." },
  SILENCING_SHARD: { name: "Silencing Shard", description: "Fire a shard that stops the target casting spells." },
  TIDE_SHARD: { name: "Tide Shard", description: "Fire a shard that damages the target and pushes it back." },
  FREEZING_SHOT: { name: "Freezing Shot", description: "Your next arrow damages the target and freezes it in place." },
  HAWK_EYE: {
    name: "Hawk Eye",
    description:
      "Your next arrow damages what it hits and marks every enemy in a wide area around where it lands. They glow and are slowed, and hidden players are revealed.",
  },
  ARROW_VOLLEY: { name: "Arrow Volley", description: "Your next shot becomes a wide volley of arrows." },
  FROSTVEIL: {
    name: "Frostveil",
    description: "Cover a large area where you look in frost. Anyone inside is slowed and cannot cast spells.",
  },
  // Bard
  RHAPSODY: { name: "Rhapsody", description: "Play a song that keeps you and players around you at Speed II." },
  SOUND_WAVE: { name: "Sound Wave", description: "Send three spreading waves that damage and slow enemies." },
  ANGELIC_SERENADE: {
    name: "Angelic Serenade",
    description: "Summon an angel and a circle that heals you and the players around you.",
  },
  SHIELD_OF_HARMONY: {
    name: "Shield of Harmony",
    description: "A ring of notes gives you and the players around you Resistance II.",
  },
  CRESCENDO: {
    name: "Crescendo",
    passive: true,
    description: "Regularly gives mana to the players around you, but not yourself.",
  },
  ENCORE: {
    name: "Encore",
    passive: true,
    description: "When an enemy you recently hit dies, you and the players around you heal and gain Speed II.",
  },
  MARCHING_SONG: {
    name: "Marching Song",
    passive: true,
    description:
      "Regularly removes Slowed from you and the players around you, friend or foe, except the enemy you are fighting.",
  },
  MEMENTO_MORI: {
    name: "Memento Mori",
    description: "Fire a homing note that damages the target, blinds it, withers it and Wounds it.",
  },
  FIRE_BREATH: { name: "Fire Breath", description: "Breathe fire in a cone that burns enemies in front of you." },
  ICE_WAVE: { name: "Ice Wave", description: "Push the enemies in front of you away, damaging and slowing them." },
  TELEPORT: {
    name: "Teleport",
    description: "After a few seconds standing still, carry you and the players around you a long way ahead.",
  },
  VIBRATIVE_STRIKE: {
    name: "Vibrative Strike",
    description: "Send three waves forward that damage and immobilise everyone they hit.",
  },
  SYMPHONY_OF_DESTRUCTION: {
    name: "Symphony of Destruction",
    description: "Launch a symphony that slows enemies inside it, then explodes and throws them into the air.",
  },
  SIRENS_CALL: {
    name: "Siren's Call",
    description: "Sing a lure that pulls everyone near where it lands to its centre, damaging and slowing them.",
  },
  CRASHING_WAVE: {
    name: "Crashing Wave",
    description: "Send a wide wave forward that damages and knocks back everything it passes through.",
  },
  MITLAN_GLYPH: {
    name: "Mitlan Glyph",
    description:
      "Draw a glyph on the ground. When someone steps on it, it goes off, damaging and slowing everyone on it and throwing them into the air.",
  },
  MAELSTROM: {
    name: "Maelstrom",
    description: "Fire a whirlpool that drags everyone nearby to its centre and damages them every second.",
  },
  // Guardian
  BULWARK: { name: "Bulwark", passive: true, description: "Regularly gain an absorption shield." },
  RETALIATION: { name: "Retaliation", passive: true, description: "Enemies that hit you take damage." },
  SECOND_WIND: {
    name: "Second Wind",
    passive: true,
    description: "When a hit leaves you badly hurt, heal and gain Resistance II.",
  },
  SHIELD_BASH: { name: "Shield Bash", passive: true, description: "Your hits knock the target back and slow it." },
  UNBROKEN: {
    name: "Unbroken",
    passive: true,
    description:
      "When you are hit while Slowed, Weakened or Frozen, shake them off and gain Resistance I for a moment.",
  },
  TANK_PULL: { name: "Tank Pull", description: "Pull the enemies in front of you towards you and slow them." },
  GROUND_SMASH: {
    name: "Ground Smash",
    description: "Leap up and smash down, stunning everyone around where you land, allies too.",
  },
  SUBSTITUTE: {
    name: "Substitute",
    description: "Swap places with a player. They gain an absorption shield and you gain Resistance I.",
  },
  SHIELD_WALL: {
    name: "Shield Wall",
    description:
      "Raise a wall of shields: you stay rooted with Resistance II, and players close to you take no damage.",
  },
  VIGIL: { name: "Vigil", passive: true, description: "Regularly gives you and the players around you Resistance I." },
  INTERCEPT: {
    name: "Intercept",
    passive: true,
    description: "When an enemy hits you, you and the players around you gain an absorption shield.",
  },
  SUNDER: { name: "Sunder", passive: true, description: "Your hits Wound the target." },
  MENDING: { name: "Mending", description: "Channel a heal on yourself. You are rooted and weakened while it lasts." },
  ICE_SHIELD: { name: "Ice Shield", description: "Gain an absorption shield." },
  RUNIC_WARD: {
    name: "Runic Ward",
    description:
      "For a short while, Silenced and Frozen fall off you as soon as they land. You cannot cast it while Silenced.",
  },
  GROUP_UP: { name: "Group Up", description: "Give everyone around you, but not yourself, an absorption shield." },
  GUARDIAN_ANGEL: {
    name: "Guardian Angel",
    description:
      "Ward a player so they take less damage and you lose that health instead. The ward never takes you low enough to kill you.",
  },
  COLD_EMBRACE: { name: "Cold Embrace", description: "Mark a spot that weakens everyone near it a second later." },
  FROZEN_TOMB: {
    name: "Frozen Tomb",
    description: "Open a tomb that freezes and damages the enemy closest to its centre.",
  },
  // Paladin
  ZEAL: { name: "Zeal", passive: true, description: "Your hits deal extra damage." },
  STEADFAST: { name: "Steadfast", passive: true, description: "When an enemy hits you, gain Resistance I." },
  AURA_OF_VALOR: {
    name: "Aura of Valor",
    passive: true,
    description: "Regularly heals you and the players around you.",
  },
  RIGHTEOUS_FURY: {
    name: "Righteous Fury",
    passive: true,
    description: "When an enemy you recently hit dies, heal and gain Strength I and Speed I.",
  },
  JUDGEMENT: { name: "Judgement", passive: true, description: "Your hits weaken the target and make it glow." },
  SPELLBREAKER: {
    name: "Spellbreaker",
    passive: true,
    description: "Your hits Silence the target, so it cannot cast spells.",
  },
  HEALING_STRIKE: {
    name: "Healing Strike",
    description: "A holy strike that throws enemies up and heals you for part of the damage it deals.",
  },
  HEALING_ORB: { name: "Healing Orb", description: "Fire an orb that heals the player it hits." },
  BLESS: {
    name: "Bless",
    description: "Remove Slowed and Weakened from you and the players right next to you.",
  },
  SMITE: { name: "Smite", description: "Call down a pillar of light that damages and Wounds everything around you." },
  CHALLENGE: {
    name: "Challenge",
    description:
      "Challenge a player you recently fought to a duel: only the two of you can hurt each other until it ends.",
  },
  HOLY_WARD: {
    name: "Holy Ward",
    passive: true,
    description: "When an enemy hits you, gain an absorption shield and weaken the attacker.",
  },
  CONSECRATION: {
    name: "Consecration",
    passive: true,
    description: "Killing an enemy makes the ground around you heal nearby players for a while.",
  },
  PURITY: {
    name: "Purity",
    passive: true,
    description: "Regularly removes Slowed, Weakened, Burnt and Frozen from you.",
  },
  SHIELDING_ORB: {
    name: "Shielding Orb",
    description: "Fire an orb that gives the player it hits an absorption shield.",
  },
  HAND_CURE: { name: "Hand Cure", description: "Lay hands on a player right next to you to heal them." },
  BLESSING_OF_SWIFTNESS: {
    name: "Blessing of Swiftness",
    description: "Give a player right next to you Speed II.",
  },
  HEAL_AURA: { name: "Heal Aura", description: "Create an aura that heals you and the players around you." },
  RESTORATION: {
    name: "Restoration",
    description:
      "After a short channel, remove Slowed, Frozen, Burnt, Weakened and Wounded from you and the players around you. Silenced stays.",
  },
  CERRITH_GLYPH: {
    name: "Cerrith Glyph",
    description: "Draw a glyph on the ground. When someone steps on it, it goes off and shields every player on it.",
  },
  BLESSING_OF_HEALING: {
    name: "Blessing of Healing",
    description: "Toggle: stay rooted and fire a healing bolt every second, draining mana until you stop.",
  },
  // Warrior
  BLOODLUST: { name: "Bloodlust", passive: true, description: "Your hits heal you." },
  CLEAVE: { name: "Cleave", passive: true, description: "Your hits also damage every enemy near you." },
  FRENZY: { name: "Frenzy", passive: true, description: "Killing an enemy gives you Strength I and Speed I." },
  UNDYING_RAGE: {
    name: "Undying Rage",
    passive: true,
    description: "When a hit leaves you at low health, gain Resistance I, Regeneration I and Strength I.",
  },
  REND: { name: "Rend", passive: true, description: "Your hits make the target bleed." },
  WAR_CHANT: {
    name: "War Chant",
    passive: true,
    description: "Regularly gives you and the players around you faster attacks.",
  },
  RALLY: {
    name: "Rally",
    passive: true,
    description: "Every few hits you land, you and the players around you gain Strength I.",
  },
  EARTHSHAKER: { name: "Earthshaker", passive: true, description: "Your hits slow every enemy near you." },
  HOLD_THE_LINE: {
    name: "Hold the Line",
    passive: true,
    description: "When an enemy hits you, you and the players around you gain Resistance I.",
  },
  INTIMIDATE: { name: "Intimidate", passive: true, description: "Your hits make the target attack slower." },
  FIRE_SHARD: { name: "Fire Shard", description: "Fire a shard that deals magic damage to the target it hits." },
  WARRIOR_DASH: { name: "Warrior Dash", description: "Dash forward, damaging everyone you pass, allies too." },
  WARRIOR_LUNGE: {
    name: "Warrior Lunge",
    description: "Leap to where you look and explode on landing. You are briefly stunned afterwards.",
  },
  WARRIOR_BEAM: {
    name: "Warrior Beam",
    description: "Fire a beam of burning light that damages each enemy it passes through.",
  },
  EMBER_STRIKE: {
    name: "Ember Strike",
    passive: true,
    description: "A few quick hits on the same target deal extra damage to it and Burn it.",
  },
  MANA_EDGE: {
    name: "Mana Edge",
    passive: true,
    description: "While your mana is high, your hits spend a little of it to sear the target.",
  },
  ARCANE_WARD: {
    name: "Arcane Ward",
    passive: true,
    description: "When an enemy hits you, gain an absorption shield and some mana back.",
  },
};

export type Subclass = {
  id: string;
  name: string;
  base: string;
  type: PathType;
  equipment: string;
  /** Only the four public schools: Cerrith, Mitlan, Oseni, Seithr. */
  magic?: string;
  lore: string;
  skills: string[];
};

/** The 15 subclasses, picked at level 2 (`MMOCore/classes/<id>.yml` on Main). */
export const subclasses: Subclass[] = [
  {
    id: "ranger",
    name: "Ranger",
    base: "archer",
    type: "Martial",
    equipment: "Longbows, Light Armour",
    lore: "Lives off the wild and never misses twice.",
    skills: ["STEADY_AIM", "HUNTERS_MARK", "FLEET_FOOTED", "EVASION", "FINISHER"],
  },
  {
    id: "trapper",
    name: "Trapper",
    base: "archer",
    type: "Semi-caster",
    equipment: "Crossbows, Light Armour",
    magic: "Cerrith, Mitlan, Oseni, Seithr",
    lore: "Covers the ground with mines, poison and frost glyphs, then waits unseen.",
    skills: ["POISON_ARROW", "ARCHER_STEP", "TOTEM_MINE", "SEITHR_GLYPH", "VENOM_TIPS", "CAMOUFLAGE"],
  },
  {
    id: "arcane_archer",
    name: "Arcane Archer",
    base: "archer",
    type: "Full caster",
    equipment: "Shortbows, Light Armour",
    magic: "Seithr, Mitlan",
    lore: "Turns every shot into a spell: frozen arrows, volleys, marking shots and silencing shards.",
    skills: ["ICE_SHARD", "SILENCING_SHARD", "FREEZING_SHOT", "HAWK_EYE", "ARROW_VOLLEY", "FROSTVEIL"],
  },
  {
    id: "minstrel",
    name: "Minstrel",
    base: "bard",
    type: "Semi-caster",
    equipment: "Lutes, Light Armour",
    magic: "Cerrith, Mitlan",
    lore: "A travelling musician whose songs heal, hasten and protect.",
    skills: [
      "FOE_SENSE",
      "RHAPSODY",
      "SOUND_WAVE",
      "ANGELIC_SERENADE",
      "SHIELD_OF_HARMONY",
      "CRESCENDO",
      "ENCORE",
      "MARCHING_SONG",
    ],
  },
  {
    id: "virtuoso",
    name: "Virtuoso",
    base: "bard",
    type: "Full caster",
    equipment: "Lutes, Light Armour",
    magic: "Oseni, Seithr, Mitlan",
    lore: "Plays music that withers, freezes and tears a battlefield apart.",
    skills: ["MEMENTO_MORI", "ICE_WAVE", "TELEPORT", "VIBRATIVE_STRIKE", "SYMPHONY_OF_DESTRUCTION"],
  },
  {
    id: "siren",
    name: "Siren",
    base: "bard",
    type: "Full caster",
    equipment: "Lutes, Light Armour",
    magic: "Mitlan",
    lore: "Sings with the voice of the water plane, luring enemies in and drowning them in waves.",
    skills: ["TIDE_SHARD", "SOUND_WAVE", "SIRENS_CALL", "CRASHING_WAVE", "MITLAN_GLYPH", "MAELSTROM"],
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    base: "guardian",
    type: "Martial",
    equipment: "Warhammers, Battleaxes, Greataxes, Greathammers, Shields, Heavy Armour",
    lore: "A wall of iron that shrugs off blows, punishes attackers and refuses to fall.",
    skills: ["BULWARK", "RETALIATION", "SECOND_WIND", "SHIELD_BASH", "UNBROKEN"],
  },
  {
    id: "warden",
    name: "Warden",
    base: "guardian",
    type: "Semi-caster",
    equipment: "Spears, Swords, Polearms, Warhammers, Shields, Battle Standards, Heavy Armour",
    magic: "Seithr",
    lore: "Holds the line, pulling and pinning enemies with frost to protect the group.",
    skills: [
      "FOE_SENSE",
      "TANK_PULL",
      "GROUND_SMASH",
      "SUBSTITUTE",
      "ICE_WAVE",
      "SHIELD_WALL",
      "GUARDIAN_ANGEL",
      "VIGIL",
      "INTERCEPT",
      "SUNDER",
    ],
  },
  {
    id: "runeward",
    name: "Runeward",
    base: "guardian",
    type: "Full caster",
    equipment: "Swords, Daggers, Spears, Shields, Heavy Armour",
    magic: "Seithr",
    lore: "Guards with frost runes instead of steel, shielding allies and locking enemies in ice.",
    skills: [
      "FOE_SENSE",
      "SILENCING_SHARD",
      "MENDING",
      "ICE_SHIELD",
      "RUNIC_WARD",
      "GROUP_UP",
      "SEITHR_GLYPH",
      "COLD_EMBRACE",
      "FROZEN_TOMB",
    ],
  },
  {
    id: "crusader",
    name: "Crusader",
    base: "paladin",
    type: "Martial",
    equipment: "Warhammers, Greathammers, Longswords, Shields, Battle Standards, Medium Armour",
    lore: "Carries faith on the edge of a blade, hitting harder and mending allies nearby.",
    skills: ["FOE_SENSE", "ZEAL", "STEADFAST", "AURA_OF_VALOR", "RIGHTEOUS_FURY", "JUDGEMENT", "SPELLBREAKER"],
  },
  {
    id: "templar",
    name: "Templar",
    base: "paladin",
    type: "Semi-caster",
    equipment: "Swords, Warhammers, Spears, Polearms, Shields, Medium Armour",
    magic: "Cerrith",
    lore: "A sworn knight who fights at the front with holy strikes, blessings and protective oaths.",
    skills: ["HEALING_STRIKE", "BLESS", "SMITE", "CHALLENGE", "DUEL_INSTINCT", "HOLY_WARD", "CONSECRATION", "PURITY"],
  },
  {
    id: "cleric",
    name: "Cleric",
    base: "paladin",
    type: "Full caster",
    equipment: "Warhammers, Swords, Spears, Shields, Light Armour",
    magic: "Cerrith",
    lore: "Sets down the sword to heal, shield and cleanse the group through the hardest fights.",
    skills: [
      "FOE_SENSE",
      "HEALING_ORB",
      "SHIELDING_ORB",
      "HAND_CURE",
      "BLESSING_OF_SWIFTNESS",
      "HEAL_AURA",
      "RESTORATION",
      "CERRITH_GLYPH",
      "BLESSING_OF_HEALING",
    ],
  },
  {
    id: "berserker",
    name: "Berserker",
    base: "warrior",
    type: "Martial",
    equipment: "Greataxes, Battleaxes, Greathammers, Shortswords, Medium Armour",
    lore: "Trades technique for fury and is most dangerous when nearly dead.",
    skills: ["BLOODLUST", "CLEAVE", "FRENZY", "UNDYING_RAGE", "REND"],
  },
  {
    id: "warlord",
    name: "Warlord",
    base: "warrior",
    type: "Martial",
    equipment: "Longswords, Swords, Spears, Polearms, Battleaxes, Battle Standards, Medium Armour",
    lore: "Leads from the front, driving allies forward with chants and rallying cries.",
    skills: ["FOE_SENSE", "WAR_CHANT", "RALLY", "EARTHSHAKER", "HOLD_THE_LINE", "INTIMIDATE"],
  },
  {
    id: "spellblade",
    name: "Spellblade",
    base: "warrior",
    type: "Semi-caster",
    equipment: "Swords, Longswords, Shortswords, Daggers, Medium Armour",
    magic: "Oseni",
    lore: "Channels fire through steel, mixing blade techniques with fire spells.",
    skills: [
      "FIRE_SHARD",
      "WARRIOR_DASH",
      "WARRIOR_LUNGE",
      "FIRE_BREATH",
      "WARRIOR_BEAM",
      "EMBER_STRIKE",
      "MANA_EDGE",
      "ARCANE_WARD",
    ],
  },
];

/** Skill slots per subclass type (`skill-slots` in each subclass file, `exp-tables.yml` on Main). */
export const slotRows: [PathType, string, string, string, string][] = [
  ["Martial", "Passive", "Slot III: passive, weaker and with a longer cooldown", "Slot II: passive", "None"],
  ["Semi-caster", "Spell or passive", "Slot III: passive", "Slot II: spell or passive", "None"],
  ["Full caster", "Spell", "Slot II: spell", "Slot III: spell", "Slot IV: spell"],
];

export type AttributeInfo = { name: string; perPoint: string };

/** The six attributes you spend points on, each capped at 20 points (`MMOCore/attributes/attributes.yml` on Main). */
export const attributes: AttributeInfo[] = [
  { name: "Strength", perPoint: "More physical damage, the kind weapon hits deal." },
  { name: "Dexterity", perPoint: "More damage with bows and crossbows." },
  { name: "Constitution", perPoint: "More maximum health." },
  { name: "Intelligence", perPoint: "More maximum mana, and your mana comes back faster." },
  { name: "Wisdom", perPoint: "Shorter skill cooldowns." },
  {
    name: "Charisma",
    perPoint:
      "Guns aim tighter and reload faster. More magic damage, the kind class spells deal, and a higher critical strike chance.",
  },
];

export type ProfessionActivityGroup = { label: string; items: string[] };

export type ProfessionInfo = {
  id: string;
  displayName: string;
  howItLevels: string;
  /** What counts towards the profession, from `plugins/MMOCore/professions/<id>.yml`. */
  activities: ProfessionActivityGroup[];
};

/** Three professions, shared by all of an account's characters (`MMOCore/professions/<id>.yml` on Main). */
export const professions: ProfessionInfo[] = [
  {
    id: "crafter",
    displayName: "Crafter",
    howItLevels: "Smelt stone, metals, glass and other materials; mine ores and stone; repair tools.",
    activities: [
      {
        label: "Smelting",
        items: [
          "Stone",
          "Deepslate",
          "Smooth Stone",
          "Charcoal",
          "Terracotta",
          "Smooth Sandstone",
          "Smooth Red Sandstone",
          "Smooth Basalt",
          "Smooth Quartz",
          "Sponge",
          "Brick",
          "Nether Brick",
          "Glass",
          "Copper Ingot",
          "Iron Ingot",
          "Gold Ingot",
        ],
      },
      {
        label: "Mining",
        items: [
          "Stone",
          "Andesite",
          "Granite",
          "Diorite",
          "Deepslate",
          "Coal Ore",
          "Iron Ore",
          "Copper Ore",
          "Redstone Ore",
          "Gold Ore",
          "Lapis Ore",
          "Diamond Ore",
          "Emerald Ore",
        ],
      },
      { label: "Repairing", items: ["Swords", "Pickaxes"] },
    ],
  },
  {
    id: "forager",
    displayName: "Forager",
    howItLevels:
      "Kill farm animals, harvest crops that you grow, and breed animals (breeding most animals needs the Breeder IV perk).",
    activities: [
      { label: "Animals", items: ["Cow", "Chicken", "Pig", "Sheep", "Rabbit"] },
      {
        label: "Crops",
        items: ["Wheat", "Beetroots", "Carrots", "Potatoes", "Cocoa", "Melon", "Pumpkin", "Sugar Cane", "Cactus"],
      },
      { label: "Mushrooms", items: ["Red Mushroom", "Brown Mushroom"] },
      { label: "Breeding", items: ["Any animal you breed"] },
    ],
  },
  {
    id: "herborist",
    displayName: "Herborist",
    howItLevels: "Gather Nether fungi and chop logs, wood and mangrove roots.",
    activities: [
      { label: "Nether plants", items: ["Nether Wart", "Crimson Fungus", "Warped Fungus"] },
      {
        label: "Logs and wood",
        items: [
          "Oak",
          "Spruce",
          "Birch",
          "Jungle",
          "Acacia",
          "Dark Oak",
          "Cherry",
          "Mangrove",
          "Pale Oak",
          "Mangrove Roots",
        ],
      },
    ],
  },
];

export const classesCommands: WikiCommandSet = {
  system: "Classes",
  href: "/wiki/classes",
  commands: [
    {
      command: "/class",
      aliases: ["/c"],
      description: "Opens Class Selection, where you pick or change your class.",
      notes: "Click a class once to select it and again to confirm.",
    },
    {
      command: "/subclass",
      description: "Opens Subclass Selection with the subclasses of your current class.",
      notes: "Subclasses unlock at class level 2.",
    },
    {
      command: "/player",
      aliases: ["/p", "/profile"],
      description: "Shows your level, professions, attributes, EXP boosters and party.",
    },
    {
      command: "/attributes",
      aliases: ["/att", "/stats"],
      description: "Opens Character Attributes, where you spend attribute points.",
    },
    {
      command: "/skills",
      aliases: ["/s"],
      description: "Opens your skill list, where you bind skills to slots and spend skill points.",
      notes: "Upgrading a skill costs 1 skill point.",
    },
    {
      command: "/profession",
      description: "Opens the profession menu (Crafter, Forager, Herborist).",
    },
    {
      command: "/profession top <profession>",
      description: "Shows the leaderboard for one profession.",
    },
    {
      command: "/profession confirm",
      description: "Confirms removing the perk you just clicked in the profession menu.",
      notes: "Within 60 seconds. The points are not refunded.",
    },
    {
      command: "/party",
      description: "Opens the party menu, where you create a party, invite players and see your members.",
      notes: "Up to 8 players. Class EXP is split within 48 blocks. Start a message with @ for party chat.",
    },
  ],
};

export const classesSection: WikiSection = {
  nav: {
    href: "/wiki/classes",
    label: "Classes & Professions",
    category: "character",
    blurb: "Pick a class and a subclass, slot your skills, spend attribute points and level three professions.",
  },
  commands: classesCommands,
};
