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
 * Games 0.7.1 on Main. games.help, games.bet and games.wager are default: true
 * in plugin.yml, so every player has these. Staff commands (games.admin) are
 * not listed.
 */
export const gamesCommands: WikiCommandSet = {
  system: "Card Games",
  href: "/wiki/card-games",
  commands: [
    {
      command: "/games help",
      description: "Opens the rule books: one for each game, plus an index.",
    },
    {
      command: "/games bet <hit|stand|double|split>",
      description: "Your Blackjack move. Typing the word in chat on your turn does the same.",
    },
    {
      command: "/games bet <check|call|raise|fold|allin>",
      description: "Your poker move. Typing the word in chat on your turn does the same.",
    },
    {
      command: "/games bet <min|max> <amount>",
      description: "Sets the Blackjack table's smallest or largest bet, as its dealer between rounds.",
    },
    {
      command: "/games bet <open|close>",
      description: "Opens or closes betting, as the Blackjack dealer.",
    },
    {
      command: "/games poker configure <buy-in> <chips> <rebuys> <ante> <minutes>",
      description: "Turns your empty Hold'em table into a tournament. A buy-in of 0 makes it a cash table again.",
    },
    {
      command: "/games poker <buyin|rebuy>",
      description: "Buys into a tournament before it starts, or back in between hands when you are out of chips.",
    },
    {
      command: "/games poker bet <chips>",
      description: "Puts tournament chips out on your turn.",
    },
    {
      command: "/games poker <start|finish|status>",
      description: "The host starts play or pays out the prize at the end. Anyone can check the status.",
    },
    {
      command: "/games poker kick <player>",
      description: "The host removes a player between hands. After play starts, they lose their buy-in.",
    },
    {
      command: "/wager <denars>",
      description: "Offers the stack you are holding as a stake, valued at that many denars per item.",
    },
    {
      command: "/wager <accept|decline>",
      description: "Votes on another player's offered stake.",
    },
  ],
};

export const gamesSection: WikiSection = {
  nav: {
    href: "/wiki/card-games",
    label: "Card Games",
    category: "social",
    blurb: "Set up a card table and play Blackjack, Hold'em, Five-Draw or Free play for real denars.",
  },
  commands: gamesCommands,
};
