import type { WikiCommandSet, WikiSection } from "./types";

// ---------- TFMCWeb account links and TFMCCore player commands ----------

export const serverFeaturesCommands: WikiCommandSet = {
  system: "Account & Website",
  href: "/wiki/server-features",
  commands: [
    {
      command: "/linkdiscord",
      description: "Gives you a code to link your Discord account. Run /linkdiscord <code> in the Discord server.",
      notes: "You cannot play in Survival until you are linked.",
    },
    {
      command: "/unlinkdiscord",
      description: "Removes your Discord link.",
      notes: "You will need to link again to play in Survival.",
    },
    {
      command: "/token create profile",
      description: "Gives you a one-time code to sign in to your profile on the website.",
    },
    {
      command: "/token create <skin|drink>",
      description: "Gives you a one-time code to upload a custom skin or drink on the website.",
      notes: "Noble rank and above. Skin and drink codes share one cooldown.",
    },
    {
      command: "/patreon [unlink]",
      description: "Links your Patreon account, shows your supporter status, or removes the link.",
    },
    {
      command: "/tfmc patreon",
      description: "Shows the link to the server's Patreon page.",
    },
    {
      command: "/tfmc tips <enable|disable>",
      description: "Turns the tips shown in chat on or off.",
    },
    {
      command: "/tfmc pack [auto|manual]",
      description: "Loads the server resource pack now, or sets whether it loads automatically when you join.",
    },
    {
      command: "/tfmc map",
      description: "Gives you the link to the nations map on the website.",
    },
    {
      command: "/tfmc date",
      description: "Shows today's weekday and month in the world's own calendar.",
    },
    {
      command: "/tcore stats <advancedcrafting|factions|rpcharacters|skills|vehicles>",
      description: "Shows your own statistics for that part of the game.",
    },
    {
      command: "/tfmc drinks",
      description: "Opens the drink builder.",
      notes: "Noble rank and above.",
    },
    {
      command: "/tfmc booster",
      description: "Starts a one-hour profession EXP booster for everyone on the server.",
      notes: "Ascended and Legacy only, once every 3 days.",
    },
  ],
};

export const serverFeaturesSection: WikiSection = {
  nav: {
    href: "/wiki/server-features",
    label: "Account & Website",
    category: "character",
    blurb: "Link Discord, sign in to the website, support the server, and handy account commands.",
  },
  commands: serverFeaturesCommands,
};
