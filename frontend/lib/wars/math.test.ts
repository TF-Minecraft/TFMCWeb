import { describe, expect, it } from "vitest";

import {
  casualtyChartGeometry,
  casualtySeries,
  deathBarWidths,
  frontCells,
  heroes,
  livesShare,
  momentum,
  orderBattles,
  pairShare,
  participantsBySide,
  sortFighters,
  worstSideLoss,
} from "./math";
import { sampleActiveWar, sampleBackfilledWar, sampleBattleReport } from "./sample";
import type { WarScore } from "./types";

function score(overrides: Partial<WarScore> = {}): WarScore {
  return {
    battles_won: { attacker: 0, defender: 0 },
    occupation: { attacker: 0, defender: 0, route_length: 9 },
    deaths: { attacker: 0, defender: 0 },
    regiments_lost: { attacker: 0, defender: 0 },
    ...overrides,
  };
}

describe("momentum", () => {
  it("is even before anything happens", () => {
    expect(momentum(score()).attacker).toBe(0.5);
    expect(momentum(score({ occupation: { attacker: 0, defender: 0, route_length: null } })).attacker).toBe(0.5);
  });

  it("weights battles 50%, ground 30% and casualties 20%", () => {
    const m = momentum(
      score({
        battles_won: { attacker: 2, defender: 1 },
        occupation: { attacker: 3, defender: 0, route_length: 9 },
        deaths: { attacker: 80, defender: 120 },
      }),
    );
    expect(m.parts.battles).toBeCloseTo(2 / 3);
    expect(m.parts.ground).toBeCloseTo(0.5 + 0.5 * (3 / 9));
    expect(m.parts.casualties).toBeCloseTo(120 / 200);
    expect(m.attacker).toBeCloseTo(0.5 * (2 / 3) + 0.3 * (2 / 3) + 0.2 * 0.6);
    expect(m.attacker + m.defender).toBeCloseTo(1);
  });

  it("gives the whole bar to a side that won everything", () => {
    const m = momentum(
      score({
        battles_won: { attacker: 0, defender: 4 },
        occupation: { attacker: 0, defender: 9, route_length: 9 },
        deaths: { attacker: 50, defender: 0 },
      }),
    );
    expect(m.attacker).toBe(0);
    expect(m.defender).toBe(1);
  });
});

describe("frontCells", () => {
  it("fills the attacker's gains from the start and marks the objective", () => {
    const { behind, route } = frontCells(9, 3, 0);
    expect(behind).toEqual([]);
    expect(route).toHaveLength(9);
    expect(route.map((c) => c.holder)).toEqual([
      "attacker",
      "attacker",
      "attacker",
      "defender",
      "defender",
      "defender",
      "defender",
      "defender",
      "defender",
    ]);
    expect(route.filter((c) => c.objective).map((c) => c.index)).toEqual([8]);
  });

  it("puts the defender's gains behind the start line and clamps bad numbers", () => {
    const { behind, route } = frontCells(4, 10, 2);
    expect(behind.map((c) => c.holder)).toEqual(["defender", "defender"]);
    expect(route.every((c) => c.holder === "attacker")).toBe(true);
    expect(frontCells(null, 2, 0).route).toEqual([]);
    expect(frontCells(-3, -1, -1)).toEqual({ behind: [], route: [] });
  });
});

describe("casualties", () => {
  it("runs deaths up battle by battle in ledger order", () => {
    const series = casualtySeries(sampleActiveWar.battles);
    expect(series.labels).toEqual(["1", "2", "3", "R"]);
    expect(series.perBattle.attacker.slice(0, 3)).toEqual([23, 38, 9]);
    expect(series.cumulative.attacker.slice(0, 3)).toEqual([23, 61, 70]);
    expect(series.cumulative.defender.at(-1)).toBe(sampleActiveWar.score.deaths.defender);
    // The raid has no regiment numbers: a gap, not a zero.
    expect(series.regiments.attacker).toEqual([3, 5, 0, null]);
  });

  it("lays out the step lines and paired bars inside the box", () => {
    const box = { width: 600, height: 240, top: 10, right: 10, bottom: 24, left: 36 };
    const geometry = casualtyChartGeometry(casualtySeries(sampleActiveWar.battles), box);
    expect(geometry.steps.attacker.startsWith(`M ${box.left} `)).toBe(true);
    expect(geometry.steps.attacker.endsWith(`H ${box.width - box.right}`)).toBe(true);
    expect(geometry.xLabels.map((l) => l.label)).toEqual(["1", "2", "3", "R"]);
    for (const point of [...geometry.points.attacker, ...geometry.points.defender]) {
      expect(point.y).toBeGreaterThanOrEqual(box.top);
      expect(point.y).toBeLessThan(geometry.barTop);
    }
    // 3 battles with regiment numbers x 2 sides; the zero bar has no height.
    expect(geometry.bars).toHaveLength(6);
    for (const bar of geometry.bars) {
      expect(bar.y + bar.height).toBeCloseTo(geometry.barBottom);
      expect(bar.y).toBeGreaterThanOrEqual(geometry.barTop - 1e-9);
    }
    // Zero sits on the line panel's floor, just above the bars.
    expect(geometry.yTicks[0]).toEqual({ value: 0, y: geometry.barTop - 14 });
  });

  it("draws nothing for a war with no battles", () => {
    const empty = casualtySeries([]);
    const geometry = casualtyChartGeometry(empty, { width: 300, height: 160, top: 8, right: 8, bottom: 16, left: 30 });
    expect(geometry.steps).toEqual({ attacker: "", defender: "" });
    expect(geometry.bars).toEqual([]);
  });

  it("scales opposing death bars to the war's worst single-side loss", () => {
    const worst = worstSideLoss(sampleActiveWar.battles);
    expect(worst).toBe(38);
    expect(deathBarWidths({ attacker: 38, defender: 19 }, worst)).toEqual({ attacker: 1, defender: 0.5 });
    expect(deathBarWidths({ attacker: 0, defender: 0 }, 0)).toEqual({ attacker: 0, defender: 0 });
  });
});

describe("ledger helpers", () => {
  it("orders battles by time, numbers breaking ties", () => {
    const ordered = orderBattles([...sampleActiveWar.battles].reverse());
    expect(ordered.map((b) => b.battle_number)).toEqual([1, 2, 3, null]);
    expect(orderBattles(sampleBackfilledWar.battles).map((b) => b.battle_number)).toEqual([1, 2]);
  });

  it("splits a pair, even when both are zero", () => {
    expect(pairShare({ attacker: 3, defender: 1 })).toBe(0.75);
    expect(pairShare({ attacker: 0, defender: 0 })).toBe(0.5);
  });

  it("groups participants per side, mercenaries included", () => {
    const sides = participantsBySide(sampleActiveWar.participants);
    expect(sides.attacker.map((p) => p.faction.name)).toEqual([
      "The Aureate Coterie",
      "The Jolly Sprockets",
      "Order of the Ash",
    ]);
    expect(sides.defender.filter((p) => p.mercenary).map((p) => p.faction.name)).toEqual(["House Malestroit"]);
  });

  it("finds the heroes, skipping a category nobody scored in", () => {
    const top = sampleActiveWar.top_fighters!;
    const found = heroes(top);
    expect(found.kills!.kills).toBe(Math.max(...top.map((f) => f.kills)));
    expect(found.damage!.damage).toBe(Math.max(...top.map((f) => f.damage)));
    expect(found.healing!.healing).toBe(Math.max(...top.map((f) => f.healing)));
    expect(heroes(top.map((f) => ({ ...f, healing: 0 }))).healing).toBeNull();
    expect(heroes(undefined)).toEqual({ kills: null, damage: null, healing: null });
  });

  it("sorts the fighter table by any column", () => {
    const fighters = sampleBattleReport.fighters!;
    const byKills = sortFighters(fighters, "kills");
    expect(byKills[0]!.kills).toBe(Math.max(...fighters.map((f) => f.kills)));
    const byName = sortFighters(fighters, "name");
    expect(byName.map((f) => f.name)).toEqual(fighters.map((f) => f.name).sort((a, b) => a.localeCompare(b)));
    const byDeathsAsc = sortFighters(fighters, "deaths", "asc");
    expect(byDeathsAsc[0]!.deaths).toBe(Math.min(...fighters.map((f) => f.deaths)));
  });

  it("reads lives left as a share", () => {
    expect(livesShare({ left: 9, max: 30 })).toBeCloseTo(0.3);
    expect(livesShare({ left: 5, max: 0 })).toBe(0);
    expect(livesShare(null)).toBe(0);
  });
});
