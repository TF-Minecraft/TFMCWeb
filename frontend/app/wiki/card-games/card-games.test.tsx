// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cardBackTexture, cardRankLabels, cardSuits, playingCards } from "../data/games";
import GamesPage from "./page";

const publicPath = (url: string) => join(process.cwd(), "public", url);

describe("playing-card catalogue", () => {
  it("covers all four suits and thirteen verified real-world ranks", () => {
    expect(cardSuits).toEqual(["Cerrith", "Mitlan", "Oseni", "Seithr"]);
    expect(cardRankLabels).toEqual(["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"]);
    expect(playingCards).toHaveLength(52);
    expect(new Set(playingCards.map((card) => card.id)).size).toBe(52);
    for (const suit of cardSuits) {
      const cards = playingCards.filter((card) => card.suit === suit);
      expect(cards.map((card) => card.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
      expect(cards.map((card) => card.rankLabel)).toEqual(cardRankLabels);
    }
  });

  it("uses a real non-empty source texture for every face and the shared back", () => {
    for (const texture of [...playingCards.map((card) => card.texture), cardBackTexture]) {
      expect(existsSync(publicPath(texture)), texture).toBe(true);
      expect(readFileSync(publicPath(texture)).length, texture).toBeGreaterThan(0);
    }
  });

  it("renders every card as a static accessible image with its rank and suit", () => {
    const html = renderToStaticMarkup(<GamesPage />);
    expect(html.match(/src="\/wiki\/textures\/cards\//g)).toHaveLength(53);
    expect(html).toContain('alt="Card back"');
    for (const card of playingCards) {
      expect(html, card.id).toContain(`alt="${card.rankLabel} of ${card.suit}"`);
    }
    expect(html).not.toContain("canvas");
  });
});
