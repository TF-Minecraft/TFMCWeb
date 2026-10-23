import { T } from "./helpers";
import type { WikiCommandSet, WikiSection } from "./types";

export const cardSuits = ["Cerrith", "Mitlan", "Oseni", "Seithr"] as const;
export const cardRankLabels = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"] as const;

export type PlayingCard = {
  id: string;
  suit: (typeof cardSuits)[number];
  rank: number;
  rankLabel: (typeof cardRankLabels)[number];
  texture: string;
};

/** Exact 52-card set from Games/cards.yml and ItemsAdder tfmc_games/contents/items.yml. */
export const playingCards: PlayingCard[] = cardSuits.flatMap((suit) =>
  cardRankLabels.map((rankLabel, index) => {
    const rank = index + 1;
    const id = `${suit.toLowerCase()}_${rank}`;
    return { id, suit, rank, rankLabel, texture: T(`cards/${id}.png`) };
  }),
);

export const cardBackTexture = T("cards/card_back.png");

/**
 * Three permissions cover every player-facing command, and all three are
 * default: true in the plugin's plugin.yml: granted to everyone. Everything
 * else at the table (placing, dealing, betting coins, drawing, discarding,
 * revealing, taking the free-play pot) is clicks and chat words, not commands.
 */
export const gamesCommands: WikiCommandSet = {
  system: "Games",
  href: "/wiki/games",
  commands: [
    {
      command: "/games",
      description: "Prints how to use /games bet.",
    },
    {
      command: "/games help",
      description: 'Opens the "Table games" index book.',
    },
    {
      command: "/games help <blackjack|poker|draw|freeplay>",
      description: "Opens that game's rule book.",
    },
    {
      command: "/games bet min <n>",
      description: "Sets the table minimum, as the dealer standing at the shoe.",
    },
    {
      command: "/games bet max <n>",
      description: "Sets the table maximum.",
    },
    {
      command: "/games bet open",
      description: "Opens betting for a round.",
    },
    {
      command: "/games bet close",
      description: "Closes betting.",
    },
    {
      command: "/games bet hit | stand | double | split",
      description: "Blackjack action on your turn.",
      notes: "The same as typing the word in chat on your turn.",
    },
    {
      command: "/games bet check | call | fold | raise | allin",
      description: "Tenceur Hold'em / Five-Draw action on your turn.",
      notes: "Put coins on the felt before you raise: the table only counts coins that are on the felt.",
    },
    {
      command: "/games poker status",
      description:
        "Shows the tournament settings at the poker table next to you: buy-in, starting chips, rebuys, ante and blind timer.",
    },
    {
      command: "/games poker buyin | rebuy",
      description: "Pays the table's buy-in to join its poker tournament, or to buy back in.",
    },
    {
      command: "/games poker bet <chips>",
      description: "Bets tournament chips on your turn.",
    },
    {
      command: "/games poker configure <buy-in> <chips> <rebuys> <ante> <blind minutes>",
      description: "Sets up the tournament. A buy-in of 0 makes it a cash game.",
      notes: "The table's owner only, between hands.",
    },
    {
      command: "/games poker start | kick <player> | finish",
      description: "Deals the next hand, removes a registered player, or pays the last player standing.",
      notes: "The table's owner only.",
    },
    {
      command: "/wager <amount>",
      description:
        "Proposes the item stack you are holding as a stake, valued at that many denars per item. The table votes on it.",
      notes: "Blackjack tables only take coins.",
    },
    {
      command: "/wager",
      description: "Commits the coins you have put on the felt this round.",
      notes: "If it is less than you need to stay in, your coins come back and you fold.",
    },
    {
      command: "/wager accept",
      description: "Votes yes on a proposed wager.",
    },
    {
      command: "/wager decline",
      description: "Votes no on a proposed wager.",
    },
  ],
};

export const gamesSection: WikiSection = {
  nav: {
    href: "/wiki/games",
    label: "Games",
    category: "combat",
    blurb: "Place a table with a Deck of Cards and bet real denars at Blackjack, Hold'em, Five-Draw, or Free play.",
  },
  commands: gamesCommands,
};
