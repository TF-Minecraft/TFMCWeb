/**
 * The war pages' numbers and chart geometry. Components only place what these
 * return, so every figure a player reads is covered by `math.test.ts`.
 */

import { buildStepPath, niceTicks } from "@/app/lib/map/ledgerSeries";

import type { BattleFighter, SidePair, TopFighter, WarBattle, WarParticipant, WarScore, WarSide } from "./types";

export const MOMENTUM_WEIGHTS = { battles: 0.5, ground: 0.3, casualties: 0.2 } as const;

export type Momentum = {
  /** The attacker's share of the bar, 0..1; the defender holds the rest. */
  attacker: number;
  defender: number;
  /** Each part as the attacker's share, 0..1, before weighting. */
  parts: { battles: number; ground: number; casualties: number };
};

function share(mine: number, theirs: number): number {
  const total = mine + theirs;
  return total > 0 ? mine / total : 0.5;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Half from battles won, 30% from ground taken along the route (the attacker's
 * provinces taken less the defender's, over the route), 20% from losses
 * inflicted (enemy deaths over all deaths). A part with nothing to compare is even.
 */
export function momentum(score: WarScore): Momentum {
  const battles = share(score.battles_won.attacker, score.battles_won.defender);
  const route = score.occupation.route_length ?? 0;
  const ground =
    route > 0 ? clamp01(0.5 + (0.5 * (score.occupation.attacker - score.occupation.defender)) / route) : 0.5;
  const casualties = share(score.deaths.defender, score.deaths.attacker);
  const attacker = clamp01(
    MOMENTUM_WEIGHTS.battles * battles + MOMENTUM_WEIGHTS.ground * ground + MOMENTUM_WEIGHTS.casualties * casualties,
  );
  return { attacker, defender: 1 - attacker, parts: { battles, ground, casualties } };
}

export type FrontCell = {
  index: number;
  holder: WarSide;
  /** Taken from its owner during the war (as opposed to held from the start). */
  taken: boolean;
  objective: boolean;
  /** One of the attacker's own provinces the defender holds, behind the start line. */
  behindLines: boolean;
};

/**
 * The route from the attacker's border to the objective, one cell per province:
 * the attacker's gains from the left, the rest the defender's, the objective
 * last. Provinces the defender has taken from the attacker sit before the start.
 */
export function frontCells(
  routeLength: number | null | undefined,
  occupiedByAttacker: number,
  occupiedByDefender: number,
): { behind: FrontCell[]; route: FrontCell[] } {
  const length = Math.max(0, Math.min(60, Math.floor(routeLength ?? 0)));
  const taken = Math.max(0, Math.min(length, Math.floor(occupiedByAttacker)));
  const lost = Math.max(0, Math.min(12, Math.floor(occupiedByDefender)));
  const behind = Array.from({ length: lost }, (_, index) => ({
    index,
    holder: "defender" as const,
    taken: true,
    objective: false,
    behindLines: true,
  }));
  const route = Array.from({ length }, (_, index) => ({
    index,
    holder: index < taken ? ("attacker" as const) : ("defender" as const),
    taken: index < taken,
    objective: index === length - 1,
    behindLines: false,
  }));
  return { behind, route };
}

/** Battles in ledger order: numbered battles first by number, then the rest by time. */
export function orderBattles(battles: readonly WarBattle[]): WarBattle[] {
  return [...battles].sort((a, b) => {
    const at = (a.at ?? "").localeCompare(b.at ?? "");
    if (at !== 0) return at;
    return (a.battle_number ?? Infinity) - (b.battle_number ?? Infinity);
  });
}

export type CasualtySeries = {
  labels: string[];
  cumulative: SidePair<number[]>;
  perBattle: SidePair<number[]>;
  regiments: SidePair<Array<number | null>>;
};

/** Running deaths per side and regiments lost per battle, in ledger order. */
export function casualtySeries(battles: readonly WarBattle[]): CasualtySeries {
  const ordered = orderBattles(battles);
  const out: CasualtySeries = {
    labels: [],
    cumulative: { attacker: [], defender: [] },
    perBattle: { attacker: [], defender: [] },
    regiments: { attacker: [], defender: [] },
  };
  const running = { attacker: 0, defender: 0 };
  for (const battle of ordered) {
    out.labels.push(battle.raid ? "R" : String(battle.battle_number ?? "·"));
    for (const side of ["attacker", "defender"] as const) {
      const deaths = battle.deaths?.[side] ?? 0;
      running[side] += deaths;
      out.perBattle[side].push(deaths);
      out.cumulative[side].push(running[side]);
      out.regiments[side].push(battle.regiments_lost ? battle.regiments_lost[side] : null);
    }
  }
  return out;
}

export type ChartBox = { width: number; height: number; top: number; right: number; bottom: number; left: number };

export type CasualtyChartGeometry = {
  steps: SidePair<string>;
  points: SidePair<Array<{ x: number; y: number; value: number }>>;
  yTicks: Array<{ value: number; y: number }>;
  xLabels: Array<{ label: string; x: number }>;
  bars: Array<{ side: WarSide; x: number; y: number; width: number; height: number; value: number }>;
  barTicks: Array<{ value: number; y: number }>;
  barTop: number;
  barBottom: number;
  /** False when no battle has regiment numbers: draw no regiments panel. */
  hasRegiments: boolean;
};

/**
 * Two stacked panels in one SVG: cumulative deaths as step lines (top) and
 * regiments lost per battle as paired bars (bottom). Battles sit at evenly
 * spaced slots, so the step after battle i holds until battle i + 1.
 */
export function casualtyChartGeometry(series: CasualtySeries, box: ChartBox, barShare = 0.32): CasualtyChartGeometry {
  const count = series.labels.length;
  const innerWidth = box.width - box.left - box.right;
  const innerHeight = box.height - box.top - box.bottom;
  const hasRegiments = [...series.regiments.attacker, ...series.regiments.defender].some((v) => v != null);
  // A war with no regiment numbers (backfilled records only) gives the lines the whole box.
  const gap = hasRegiments ? 14 : 0;
  const barHeight = hasRegiments ? Math.max(20, innerHeight * barShare) : 0;
  const lineHeight = innerHeight - barHeight - gap;
  const slot = count > 0 ? innerWidth / count : innerWidth;
  const x = (index: number) => box.left + slot * (index + 0.5);

  const maxDeaths = Math.max(1, ...series.cumulative.attacker, ...series.cumulative.defender);
  const yTicksRaw = niceTicks(0, maxDeaths, 4);
  const yMax = Math.max(maxDeaths, yTicksRaw[yTicksRaw.length - 1] ?? maxDeaths);
  const y = (value: number) => box.top + lineHeight - (value / yMax) * lineHeight;

  // The step line starts from zero at the left edge, so battle 1 is a step up too.
  const stepFor = (values: number[]) => {
    if (count === 0) return "";
    const withStart = [0, ...values];
    const sx = (index: number) => (index === 0 ? box.left : x(index - 1));
    return `${buildStepPath(withStart, sx, y)} H ${box.left + innerWidth}`;
  };

  const barTop = box.top + lineHeight + gap;
  const barBottom = barTop + barHeight;
  const regimentValues = [...series.regiments.attacker, ...series.regiments.defender].filter(
    (v): v is number => v != null,
  );
  const maxRegiments = Math.max(1, ...regimentValues);
  const barTicksRaw = niceTicks(0, maxRegiments, 2);
  const barMax = Math.max(maxRegiments, barTicksRaw[barTicksRaw.length - 1] ?? maxRegiments);
  const barY = (value: number) => barBottom - (value / barMax) * (barHeight || 1);
  const barWidth = Math.max(2, Math.min(14, slot * 0.28));
  const bars: CasualtyChartGeometry["bars"] = [];
  series.labels.forEach((_, index) => {
    (["attacker", "defender"] as const).forEach((side, k) => {
      const value = series.regiments[side][index];
      if (value == null) return;
      const top = barY(value);
      bars.push({
        side,
        x: x(index) + (k === 0 ? -barWidth - 1 : 1),
        y: top,
        width: barWidth,
        height: barBottom - top,
        value,
      });
    });
  });

  return {
    steps: { attacker: stepFor(series.cumulative.attacker), defender: stepFor(series.cumulative.defender) },
    points: {
      attacker: series.cumulative.attacker.map((value, i) => ({ x: x(i), y: y(value), value })),
      defender: series.cumulative.defender.map((value, i) => ({ x: x(i), y: y(value), value })),
    },
    yTicks: yTicksRaw.filter((v) => v <= yMax).map((value) => ({ value, y: y(value) })),
    xLabels: series.labels.map((label, i) => ({ label, x: x(i) })),
    bars,
    barTicks: barTicksRaw.filter((v) => v <= barMax).map((value) => ({ value, y: barY(value) })),
    barTop,
    barBottom,
    hasRegiments,
  };
}

/** Opposing deaths bars for one battle, as fractions of the war's worst single-side loss. */
export function deathBarWidths(deaths: SidePair, worst: number): SidePair {
  const scale = Math.max(1, worst);
  return {
    attacker: Math.min(1, (deaths.attacker ?? 0) / scale),
    defender: Math.min(1, (deaths.defender ?? 0) / scale),
  };
}

export function worstSideLoss(battles: readonly WarBattle[]): number {
  let worst = 0;
  for (const battle of battles) {
    worst = Math.max(worst, battle.deaths?.attacker ?? 0, battle.deaths?.defender ?? 0);
  }
  return worst;
}

/** A tile's two numbers as a split bar: the attacker's share, 0..1 (even when both are 0). */
export function pairShare(pair: SidePair): number {
  return share(pair.attacker, pair.defender);
}

export function participantsBySide(rows: readonly WarParticipant[]): SidePair<WarParticipant[]> {
  return {
    attacker: rows.filter((row) => row.side === "attacker"),
    defender: rows.filter((row) => row.side === "defender"),
  };
}

export type Heroes = {
  kills: TopFighter | null;
  damage: TopFighter | null;
  healing: TopFighter | null;
};

function best(fighters: readonly TopFighter[], key: "kills" | "damage" | "healing"): TopFighter | null {
  let top: TopFighter | null = null;
  for (const fighter of fighters) {
    if (fighter[key] <= 0) continue;
    if (!top || fighter[key] > top[key] || (fighter[key] === top[key] && fighter.name.localeCompare(top.name) < 0)) {
      top = fighter;
    }
  }
  return top;
}

export function heroes(fighters: readonly TopFighter[] | undefined): Heroes {
  const list = fighters ?? [];
  return { kills: best(list, "kills"), damage: best(list, "damage"), healing: best(list, "healing") };
}

export type FighterSortKey =
  | "name"
  | "class_name"
  | "kills"
  | "deaths"
  | "assists"
  | "damage"
  | "damage_taken"
  | "healing"
  | "cc"
  | "friendly_damage";

/** Text columns sort A to Z first; numbers sort highest first. */
export function defaultSortDirection(key: FighterSortKey): "asc" | "desc" {
  return key === "name" || key === "class_name" ? "asc" : "desc";
}

export function sortFighters(
  fighters: readonly BattleFighter[],
  key: FighterSortKey,
  direction: "asc" | "desc" = defaultSortDirection(key),
): BattleFighter[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...fighters].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    let order: number;
    if (typeof av === "number" && typeof bv === "number") order = av - bv;
    else order = String(av ?? "").localeCompare(String(bv ?? ""));
    if (order !== 0) return order * sign;
    return a.name.localeCompare(b.name);
  });
}

/** Lives left as a share of the side's starting lives. */
export function livesShare(lives: { left: number; max: number } | null | undefined): number {
  if (!lives || lives.max <= 0) return 0;
  return Math.min(1, Math.max(0, lives.left / lives.max));
}
