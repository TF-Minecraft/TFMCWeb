import type { WikiCommandSet, WikiSection } from "./types";

// ---------- RPCharacters ----------

export const charactersCommands: WikiCommandSet = {
  system: "Characters",
  href: "/wiki/characters",
  commands: [
    {
      command: "/rpcharacter menu",
      description:
        "Returns you to the character selection screen, or reopens a character you have not finished creating.",
      notes: "Stand still for 5 seconds. Not while dead, falling, riding, duelling or fighting.",
    },
    {
      command: "/rpcharacter edit [entry]",
      description: "Reopens your character's choices, or one of them, so you can change any that have not locked yet.",
    },
    {
      command: "/rpcharacter kit <id>",
      description: "Claims a kit, e.g. /rpcharacter kit starter.",
      notes: "Starter kit: once per character, 48 hours between claims on different characters.",
    },
    {
      command: "/rpcharacter clues",
      description: "Shows your character's clues.",
    },
    {
      command: "/rpcharacter wardrobe [slot]",
      description: "Opens the wardrobe menu, or equips a slot directly (base, extra_1, extra_2, or a saved name).",
    },
    {
      command: "/rpcharacter party create <name> | invite <player> | join | leave | kick <player> | info",
      description: "Temporary RP party chat groups. Not the dungeon /party command.",
      notes: "Talk to your party with /pooc.",
    },
    {
      command: "/rpcharacter injure <player>",
      description: "Starts a consensual roleplay injury on another player. They must accept it.",
      notes: "10-block range, 30 seconds to accept.",
    },
    {
      command: "/rpcharacter strikes",
      description: "Shows how many strikes your character has.",
    },
    {
      command: "/rpcharacter profile [player]",
      description: "Shows your character card, or another player's.",
      notes: "Masked players cannot be read.",
    },
    {
      command: "/rpcharacter alias <name>",
      description: "Sets a name others see in place of your character's name (or /rpcharacter alias clear).",
      notes: "10-second cooldown.",
    },
    {
      command: "/rpcharacter namecolour <#hex...>",
      description: "Sets your character's name colour, or a gradient across several colours (or clear).",
      notes: "Noble rank and above. How many colours you can use depends on your rank.",
    },
    {
      command: "/rpcharacter gender <Male/Female/Other>",
      description: "Sets your character's gender.",
      notes: "10-second cooldown.",
    },
    {
      command: "/rpcharacter description <text>",
      description: "Sets your character's description (or /rpcharacter description clear).",
      notes: "32 to 256 characters, 10-second cooldown.",
    },
    {
      command: "/rpcharacter birthday <DD.MM.YYYY>",
      description: "Sets your character's birthday on the in-fiction calendar (or clear).",
      notes: "Your character must be at least 18 and no older than your race allows.",
    },
    {
      command: "/rpcharacter mail [on|off]",
      description: "Lists or unlists your character as a bird mail recipient.",
    },
    {
      command: "/rpcharacter tempalias <name>",
      description: "Sets a session-only alias (or /rpcharacter tempalias clear).",
      access: "permission",
      permission: "rpchar.tempalias",
      notes: "No player rank has this permission.",
    },
    {
      command: "/rpcharacter sethidden <slug> [clear]",
      description: "Hides one of your characters from TAB and character lists.",
      access: "permission",
      permission: "rpchar.character.hidden",
      notes: "No player rank has this permission.",
    },
    {
      command: "/roll [max or attribute] [+/-mod]",
      description: "Rolls dice and shows the result to players within 20 blocks.",
      notes: "Bare /roll is 1 to 200; attribute rolls use a d20 plus the attribute's modifier.",
    },
    {
      command: "/players",
      description: "Opens the list of online players.",
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
      command: "/pvp start",
      description: "Warns everyone within 80 blocks that a fight starts in 10 seconds.",
      notes: "The fight lasts 15 minutes. Losing it can give strikes.",
    },
    {
      command: "/pvp end",
      description: "Ends the fight you are in, or cancels it before it starts.",
    },
    {
      command: "/pvp lethal",
      description: "Sets your character's PvP mode to lethal.",
      notes:
        "Confirm within 30 seconds with /pvp lethal confirm. Lasts until you log out, switch character or run /pvp nonlethal.",
    },
    {
      command: "/pvp nonlethal",
      description: "Sets your character's PvP mode back to nonlethal, the default.",
    },
    {
      command: "/duel <player> | accept | decline | cancel | yield",
      description: "Challenges a player to a friendly duel that nobody dies or loses anything in.",
      notes: "16-block range, 30 seconds to accept, up to 10 minutes.",
    },
    {
      command: "/grave unlock",
      description: "Unlocks your newest grave so anyone can loot it.",
    },
    {
      command: "/will",
      description: "Names or revokes your character's heir.",
    },
    {
      command: "/estate collect",
      description: "Collects an inheritance for the character you are playing.",
    },
    {
      command: "/channel [id]",
      description: "Sets your default chat channel, or shows the current one with no argument.",
      notes: "rp, ooc, looc, whisper, shout, yell, action.",
    },
    {
      command: "/channeltoggle <id>",
      description: "Shows or hides one chat channel in your own view.",
      notes: "looc, ooc, gooc, fooc, pooc.",
    },
    {
      command: "/rp <message>",
      description: "In-character speech.",
      notes: "15-block range.",
    },
    {
      command: "/shout <message>",
      description: "Louder in-character speech.",
      notes: "24-block range.",
    },
    {
      command: "/yell <message>",
      aliases: ["/y"],
      description: "Your loudest in-character shout, shown in bold red.",
      notes: "48-block range.",
    },
    {
      command: "/whisper <message>",
      aliases: ["/wh"],
      description: "Quiet in-character speech only those right next to you hear.",
      notes: "2-block range, italic.",
    },
    {
      command: "/me <message>",
      description: "An emote or action, shown as narration rather than speech.",
      notes: "20-block range.",
    },
    {
      command: "/scene <message>",
      description: "Describes the scene, like /me but without a speech bubble.",
      notes: "20-block range.",
    },
    {
      command: "/looc <message>",
      description: "Local out-of-character chat.",
      notes: "20-block range. Works with no character.",
    },
    {
      command: "/ooc <message>",
      description: "Global out-of-character chat.",
      notes: "Works with no character.",
    },
    {
      command: "/gooc <message>",
      description: "Out-of-character chat with your guild.",
      notes: "One message every 3 seconds.",
    },
    {
      command: "/fooc <message>",
      description: "Out-of-character chat with your faction.",
      notes: "One message every 3 seconds.",
    },
    {
      command: "/rooc <message>",
      description: "Out-of-character chat with your whole realm, overlord and vassals included.",
      notes: "One message every 3 seconds. Works with no character.",
    },
    {
      command: "/pooc <message>",
      description: "Out-of-character chat with your RP party.",
      notes: "One message every 3 seconds.",
    },
  ],
};

export const charactersSection: WikiSection = {
  nav: {
    href: "/wiki/characters",
    label: "Characters",
    category: "character",
    blurb: "Choose and create characters, and learn how chat, injuries, death and clues work.",
  },
  commands: charactersCommands,
};
