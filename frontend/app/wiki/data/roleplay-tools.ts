import type { WikiCommandSet, WikiSection } from "./types";

// ---------- GSit, the Armor Statues datapack, TFMCCore lore and name stones, Images, Essentials books ----------

export const roleplayToolsCommands: WikiCommandSet = {
  system: "Roleplay Tools",
  href: "/wiki/roleplay-tools",
  commands: [
    {
      command: "/sit",
      description: "Sits you down where you stand.",
    },
    {
      command: "/sit toggle",
      description: "Turns sitting by right-clicking stairs, slabs, carpets and snow on or off.",
      notes: "On by default.",
    },
    {
      command: "/lay",
      aliases: ["/glay"],
      description: "Makes you lie down.",
    },
    {
      command: "/layback",
      aliases: ["/glayback"],
      description: "Makes you lie on your back.",
    },
    {
      command: "/bellyflop",
      aliases: ["/gbellyflop"],
      description: "Makes you lie face down.",
    },
    {
      command: "/spin",
      aliases: ["/gspin"],
      description: "Makes you spin around on the ground.",
    },
    {
      command: "/crawl",
      aliases: ["/gcrawl"],
      description: "Drops you into a crawl.",
      notes: "Double-tapping sneak does not start a crawl on this server.",
    },
    {
      command: "/tfmc statues",
      description: "Gives you the Armor Statues book.",
    },
    {
      command: "/tfmc masks",
      description: "Gives you a random mask.",
      notes: "Once every 10 seconds.",
    },
    {
      command: "/tfmc patterns",
      description: "Gives you all 10 banner patterns.",
      notes: "Once every 10 seconds.",
    },
    {
      command: "/image create <url> [scale]",
      aliases: ["/images", "/img"],
      description: "Makes map art from a picture online. Right-click the block where it should go.",
      notes: "The scale is a percentage of the picture's size.",
    },
    {
      command: "/image delete",
      aliases: ["/images", "/img"],
      description: "Removes a picture. Right-click the picture after running it.",
      notes: "Anyone can delete any picture.",
    },
    {
      command: "/book",
      description: "Makes the signed book you hold editable again, or signs the book and quill you hold.",
    },
    {
      command: "/book title <title>",
      description: "Changes the title of the signed book you hold.",
    },
    {
      command: "/book author <name>",
      description: "Changes the author of the signed book you hold.",
    },
    {
      command: "/anvil",
      description: "Opens an anvil wherever you are.",
    },
  ],
};

export const roleplayToolsSection: WikiSection = {
  nav: {
    href: "/wiki/roleplay-tools",
    label: "Roleplay Tools",
    category: "character",
    blurb: "Sit, lie down and crawl, pose armour stands, wear masks, hang pictures, edit books and name your items.",
  },
  commands: roleplayToolsCommands,
};
