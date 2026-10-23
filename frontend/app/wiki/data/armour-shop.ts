import type { WikiCommandSet, WikiSection } from "./types";

/** The four Skin Scroll tiers, from Main's `ArmourShop/config.yml` `scrolls`. */
export const skinScrolls = ["Common", "Rare", "Epic", "Legendary"].map((tier) => ({
  name: `${tier} Item Skin Scroll`,
  image: `/wiki/textures/skin-scrolls/${tier.toLowerCase()}.png`,
}));

export type CustomSkinRank = { rank: "Noble" | "Gilded" | "Ascended" | "Legacy"; kinds: string };

/**
 * What each rank may upload, from Main's `TFMCWeb/config.yml` `player-meta.skins`, which the
 * website enforces. Legacy inherits Ascended. Code cooldowns live on the Account & Website page.
 */
export const customSkinRanks: CustomSkinRank[] = [
  { rank: "Noble", kinds: "Weapons, tools, bows, crossbows and books" },
  { rank: "Gilded", kinds: "Everything above, plus armour sets" },
  { rank: "Ascended", kinds: "Everything above, plus 3D items, 3D helmets, shields, guns and masks" },
  { rank: "Legacy", kinds: "Everything Ascended can" },
];

/** ArmourShop 1.1.19. Every other `/armourshop` subcommand is staff only. */
export const armourShopCommands: WikiCommandSet = {
  system: "Armour Shop",
  href: "/wiki/armour-shop",
  commands: [
    {
      command: "/armourshop",
      description: "Opens the skin shop.",
    },
  ],
};

export const armourShopSection: WikiSection = {
  nav: {
    href: "/wiki/armour-shop",
    label: "Armour Shop",
    category: "social",
    blurb: "Change how your armour, weapons and tools look with Skin Scrolls, or upload a skin of your own.",
  },
  commands: armourShopCommands,
};
