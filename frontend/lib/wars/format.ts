/**
 * Words and dates for the war pages. Dates are dd/mm/yyyy and times are server
 * time (Paris, CET/CEST), as the wiki states battle times.
 */

import { parseRgbString } from "@/app/lib/map/titleRgb";

import type {
  BattleDay,
  FactionRef,
  ParticipantRole,
  Resolution,
  WarResult,
  WarSide,
  WarState,
  WarStatus,
  WarSummary,
} from "./types";

export const SERVER_TIME_ZONE = "Europe/Paris";

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: SERVER_TIME_ZONE,
});
const shortDayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  timeZone: SERVER_TIME_ZONE,
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: SERVER_TIME_ZONE,
  timeZoneName: "short",
});
const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `2026-11-19` or an ISO instant as `19/11/2026`. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "";
  const day = DAY_PATTERN.exec(value);
  if (day) return `${day[3]}/${day[2]}/${day[1]}`;
  const date = toDate(value);
  return date ? dayFormat.format(date) : "";
}

/** `19/11` for chips where the year is plain from context. */
export function formatShortDay(value: string | null | undefined): string {
  if (!value) return "";
  const day = DAY_PATTERN.exec(value);
  if (day) return `${day[3]}/${day[2]}`;
  const date = toDate(value);
  return date ? shortDayFormat.format(date) : "";
}

/** Paris time's short name at an instant: `CET`, or `CEST` in summer. */
export function serverZoneName(at: Date): string {
  const name =
    new Intl.DateTimeFormat("en-GB", { timeZone: SERVER_TIME_ZONE, timeZoneName: "short" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? "CET";
  // Intl names Paris time "CET"/"CEST" in en-GB, or "GMT+1" in older ICU builds.
  return name.replace(/^GMT\+1$/, "CET").replace(/^GMT\+2$/, "CEST");
}

function zoneOffsetMs(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - at;
}

/**
 * The instant a battle-day hour starts: `2026-11-20` hour 25 is 01:00 Paris time on the 21st
 * (battle-day hours run past midnight).
 */
export function serverInstant(date: string, hour: number): Date | null {
  const match = DAY_PATTERN.exec(date);
  if (!match) return null;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour);
  let at = wall - zoneOffsetMs(wall, SERVER_TIME_ZONE);
  at = wall - zoneOffsetMs(at, SERVER_TIME_ZONE);
  return new Date(at);
}

/** `21:00 CET`. */
export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const parts = timeFormat.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${serverZoneName(date)}`.trim();
}

/** `19/11/2026 21:00 CET`. */
export function formatDateTime(value: string | null | undefined): string {
  const day = formatDay(value);
  return day ? `${day} ${formatTime(value)}` : "";
}

export function formatCount(value: number | null | undefined): string {
  return numberFormat.format(Math.round(value ?? 0));
}

/** `1 h 11 min`, `42 min`. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Kills per death; a fighter who never fell reads as their kills. */
export function formatKd(kills: number, deaths: number): string {
  return (kills / Math.max(1, deaths)).toFixed(2);
}

export function formatPercent(share: number | null | undefined): string {
  if (share == null || !Number.isFinite(share)) return "–";
  return `${Math.round(share * 100)}%`;
}

const GOALS: Record<string, string> = {
  de_jure_annex: "Annex de jure lands",
  subjugate: "Subjugate",
  transfer_subject: "Take a subject",
  tributary: "Make tributary",
  usurp: "Usurp the throne",
  open_market: "Open the market",
  change_government: "Change the government",
  pillage: "Pillage",
  overthrow: "Overthrow",
  change_law: "Change a law",
  change_tax: "Change a tax",
  force_peace: "Force peace",
};

function words(value: string): string {
  const text = value.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function goalLabel(goal: string | null | undefined): string {
  if (!goal) return "";
  return GOALS[goal] ?? words(goal);
}

const RESOLUTIONS: Record<Resolution, string> = {
  fought: "Fought",
  autoresolve: "Autoresolved",
  forfeit: "Forfeit",
  naval_default: "Naval default",
  staff: "Staff decision",
};

export function resolutionLabel(resolution: Resolution | string | null | undefined): string {
  if (!resolution) return "";
  return RESOLUTIONS[resolution as Resolution] ?? words(resolution);
}

const ROLES: Record<ParticipantRole | "mercenary", string> = {
  leader: "War leader",
  main: "Main belligerent",
  subject: "Subject",
  ally: "Ally",
  coalition: "Coalition",
  backer: "Backer",
  mercenary: "Mercenaries",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "";
  return ROLES[role as ParticipantRole] ?? words(role);
}

const KINDS: Record<string, string> = { field: "Field", siege: "Siege", raid: "Raid", naval: "Naval" };

export function kindLabel(kind: string | null | undefined): string {
  if (!kind) return "Battle";
  return KINDS[kind] ?? words(kind);
}

export const SIDE_LABEL: Record<WarSide, string> = { attacker: "Attackers", defender: "Defenders" };

/** "Malestroit Keep", or "Province 80" when no marker names it. */
export function provinceLabel(name: string | null | undefined, id: number | null | undefined): string {
  if (name) return name;
  if (id != null) return `Province ${id}`;
  return "Unknown ground";
}

/** The war result as a short chip: "Attacker victory", "White peace". */
export function resultLabel(result: WarResult | null | undefined): string {
  if (!result) return "Ended";
  if (result.winner === "attacker") return "Attacker victory";
  if (result.winner === "defender") return "Defender victory";
  const reason = result.reason ?? "";
  if (reason.includes("white")) return "White peace";
  if (reason.includes("admin") || reason.includes("staff")) return "Ended by staff";
  return "Ended";
}

type StatusInput = {
  status: WarStatus;
  result: WarResult | null;
  phase:
    | (Pick<WarState, "buildup" | "day_vote_closes_at" | "battle_day" | "scheduled_at"> & {
        battle_days?: BattleDay[] | null;
      })
    | null;
};

/**
 * The start of a battle day's battle: `22:00 CEST`. Hours 24 and 25 start the next calendar
 * day, so they say so: `00:00 CET on 21/11` (`21/11/2026` with `fullDay`).
 */
function battleHour(date: string, hour: number, fullDay = false): string {
  const at = serverInstant(date, hour);
  if (!at) return `${String(hour % 24).padStart(2, "0")}:00`;
  const time = formatTime(at.toISOString());
  if (hour < 24) return time;
  const day = at.toISOString();
  return `${time} on ${fullDay ? formatDay(day) : formatShortDay(day)}`;
}

/** The war list's status chip. */
export function statusChip({ status, result, phase }: StatusInput, now: Date = new Date()): string {
  if (status === "ended") return resultLabel(result);
  if (!phase) return "In progress";
  const scheduled = toDate(phase.scheduled_at);
  if (scheduled && scheduled.getTime() >= now.getTime() - 3 * 3600_000) {
    return `Battle ${formatShortDay(phase.scheduled_at)} ${formatTime(phase.scheduled_at)}`;
  }
  if (phase.buildup && phase.day_vote_closes_at && !phase.battle_day) {
    return `Buildup: day vote closes ${formatShortDay(phase.day_vote_closes_at)}`;
  }
  const next = phase.battle_days?.[0];
  if (next) {
    return `Battle day ${formatShortDay(next.date)}${next.hour != null ? ` ${battleHour(next.date, next.hour)}` : ""}`;
  }
  if (phase.battle_day) return `Battle day ${formatShortDay(phase.battle_day)}`;
  if (phase.buildup) return "Buildup";
  return "In progress";
}

export function summaryStatusChip(war: WarSummary, now?: Date): string {
  return statusChip({ status: war.status, result: war.result, phase: war.phase }, now);
}

/** A side's leader for colours and banners, or null when unknown. */
export function sideLeader(state: WarState | null | undefined, side: WarSide): FactionRef | null {
  const rows = state?.sides?.[side] ?? [];
  return rows.find((row) => row.role === "leader") ?? rows[0] ?? null;
}

/** "The Aureate Coterie", or "the attackers". */
export function sideName(leader: FactionRef | null | undefined, side: WarSide, capital = false): string {
  if (leader?.name) return leader.name;
  const text = side === "attacker" ? "the attackers" : "the defenders";
  return capital ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** The war page's status line under its name. */
export function statusLine(
  model: { status: WarStatus; result: WarResult | null; ended_at: string | null; state: WarState | null },
  now: Date = new Date(),
): string {
  const { state } = model;
  if (model.status === "ended") {
    const winner = model.result?.winner;
    const when = model.ended_at ? ` on ${formatDay(model.ended_at)}` : "";
    if (winner) return `Ended${when} in victory for ${sideName(sideLeader(state, winner), winner)}.`;
    const label = resultLabel(model.result);
    if (label === "White peace") return `Ended${when} in a white peace.`;
    return `Ended${when}.`;
  }
  if (!state) return "In progress.";
  const scheduled = toDate(state.scheduled_at);
  if (scheduled && scheduled.getTime() >= now.getTime() - 3 * 3600_000) {
    return `Next battle ${formatDateTime(state.scheduled_at)}.`;
  }
  if (state.buildup && state.day_vote_closes_at && !state.battle_day) {
    return `Buildup: the vote on the first battle day closes ${formatDateTime(state.day_vote_closes_at)}.`;
  }
  const next = state.battle_days?.[0];
  if (next) {
    return `Next battle day ${formatDay(next.date)}${next.hour != null ? `, starting ${battleHour(next.date, next.hour, true)}` : ""}.`;
  }
  if (state.battle_day) return `Next battle day ${formatDay(state.battle_day)}.`;
  if (state.buildup) return "Buildup: the sides are gathering.";
  return "In progress.";
}

/** Fallbacks when a leader has no colour: a warm/cool pair checked for colour-blind separation. */
export const DEFAULT_SIDE_COLOR: Record<WarSide, string> = {
  attacker: "#c9772e",
  defender: "#5a93dc",
};

/** The page surface (`--tfmc-forest-deep`) marks are drawn on. */
const SURFACE: [number, number, number] = [15, 28, 22];

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** A faction colour lifted toward white until it reads `min`:1 on the dark page (3 for marks, 4.5 for text). */
export function legibleRgb(rgb: [number, number, number], min = 3): [number, number, number] {
  let out = rgb;
  for (let step = 1; step <= 10 && contrast(out, SURFACE) < min; step++) {
    const t = step / 10;
    out = rgb.map((c) => Math.round(c + (255 - c) * t)) as [number, number, number];
  }
  return out;
}

function hex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** The side's mark colour from its leader's `"r,g,b"`, else the side's fallback. */
export function sideColor(ref: FactionRef | null | undefined, side: WarSide): string {
  const rgb = ref?.rgb ? parseRgbString(ref.rgb) : null;
  return rgb ? hex(legibleRgb(rgb)) : DEFAULT_SIDE_COLOR[side];
}

function distance(a: string, b: string): number {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return Math.hypot(pa[0]! - pb[0]!, pa[1]! - pb[1]!, pa[2]! - pb[2]!);
}

/** Two leaders with near-identical colours would draw one bar: then both sides take the fallbacks. */
export function sideColors(
  attacker: FactionRef | null | undefined,
  defender: FactionRef | null | undefined,
): Record<WarSide, string> {
  const colours = { attacker: sideColor(attacker, "attacker"), defender: sideColor(defender, "defender") };
  return distance(colours.attacker, colours.defender) < 80 ? { ...DEFAULT_SIDE_COLOR } : colours;
}

/** The nation banner the map generates per colour: `/{map}/banners/nation/R_G_B.png`. */
export function bannerPath(mapId: string, ref: FactionRef | null | undefined): string | null {
  const rgb = ref?.rgb ? parseRgbString(ref.rgb) : null;
  if (!rgb) return null;
  return `/${encodeURIComponent(mapId)}/banners/nation/${rgb.join("_")}.png`;
}

/** Links keep `?map=` for any map but `main`. */
export function warsHref(mapId: string, path = ""): string {
  const base = `/wars${path}`;
  return mapId === "main" ? base : `${base}?map=${encodeURIComponent(mapId)}`;
}

export function warHref(mapId: string, warKey: string): string {
  return warsHref(mapId, `/${encodeURIComponent(warKey)}`);
}

export function battleHref(mapId: string, warKey: string, recordId: string): string {
  return warsHref(mapId, `/${encodeURIComponent(warKey)}/battles/${encodeURIComponent(recordId)}`);
}

/** "Battle 3 · Ashford · Field · 19/11/2026". */
export function battleTitle(battle: {
  battle_number: number | null;
  raid: boolean;
  province_name: string | null;
  province_id: number | null;
  kind: string | null;
  at: string | null;
}): string {
  const head = battle.raid ? "Raid" : battle.battle_number != null ? `Battle ${battle.battle_number}` : "Battle";
  const parts = [head, provinceLabel(battle.province_name, battle.province_id)];
  if (!battle.raid) parts.push(kindLabel(battle.kind));
  const day = formatDay(battle.at);
  if (day) parts.push(day);
  return parts.join(" · ");
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "The Aureate Coterie has taken 3 of the 9 provinces on the road to Malestroit Keep." */
export function frontSentence(
  names: Record<WarSide, string>,
  taken: number,
  lost: number,
  route: number,
  objective: string,
): string {
  const has = (side: WarSide) => (names[side].startsWith("the ") ? "have" : "has");
  const head = taken
    ? `${capital(names.attacker)} ${has("attacker")} taken ${taken} of the ${route} provinces on the road to ${objective}.`
    : `${capital(names.attacker)} ${has("attacker")} not taken a province on the road to ${objective} yet.`;
  const back = lost
    ? ` ${capital(names.defender)} ${has("defender") === "have" ? "hold" : "holds"} ${lost} of the attackers' own provinces.`
    : "";
  return head + back;
}
