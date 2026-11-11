/**
 * Battle availability (contract v1.4): players mark every date and start time they
 * could fight. Shapes as `backend/src/wars/actions.py` returns them on `/me`; routes in
 * `docs/docs/map/war-history.md#battle-availability`.
 *
 * Dates are battle-day dates in server time (Europe/Paris). Hours are battle-day hours:
 * 24 is 00:00 and 25 is 01:00 the next calendar day.
 */

import { SERVER_TIME_ZONE, serverInstant, serverZoneName } from "./format";
import type { BattleDay, SidePair } from "./types";
import type { ActionStatusView, WarAction, WarMe } from "./actions";

export type DateState = "open" | "battle" | "no_battle";

export type AvailabilityDate = {
  date: string;
  label: string;
  state: DateState;
  day_locks_at: string | null;
  time_locks_at: string | null;
  /** The start hour, once the time is decided. */
  hour: number | null;
  /** Marks on this date can still change. */
  editable: boolean;
  /** A battle day set after too many days without one. */
  forced: boolean;
};

export type AvailabilityVote = {
  kind: "availability";
  closes_at: string | null;
  /** Only for eligible users. */
  hours?: number[];
  hour_labels?: string[];
  dates?: AvailabilityDate[];
  need?: SidePair;
};

export type AvailabilityTallyRow = { date: string; hour: number; attacker: number; defender: number };

/** One user's marks: date -> start hours. */
export type Marks = Record<string, number[]>;

export function availabilityVote(me: WarMe | null): AvailabilityVote | null {
  return me?.vote?.kind === "availability" ? me.vote : null;
}

// --- server time -------------------------------------------------------------------------

export { serverInstant };

/** `22:00` in the given time zone (the browser's by default). */
export function clockTime(at: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(
    at,
  );
}

/** `Fri 20 Nov` for a `YYYY-MM-DD` date. */
export function dayLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const at = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(at)
    .replace(",", "");
}

/** `Thu 21:00` in server time, for a lock instant. */
export function lockLabel(value: string | null | undefined): string {
  if (!value) return "";
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return "";
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: SERVER_TIME_ZONE }).format(at);
  return `${weekday} ${clockTime(at, SERVER_TIME_ZONE)}`;
}

/** `Wed 18 Nov, 21:00 CET` in server time. */
export function lockDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: SERVER_TIME_ZONE,
  })
    .format(at)
    .replace(",", "");
  return `${day}, ${clockTime(at, SERVER_TIME_ZONE)} ${serverZoneName(at)}`;
}

/** `00:00 CET` for hour 24, with the plugin's label when it sent one. */
export function hourLabel(vote: AvailabilityVote, hour: number): string {
  const index = vote.hours?.indexOf(hour) ?? -1;
  return (index >= 0 && vote.hour_labels?.[index]) || `${String(hour % 24).padStart(2, "0")}:00 CET`;
}

/** The viewer's own clock time for a battle-day hour, or "" when it reads the same as server time. */
export function localHour(date: string, hour: number, timeZone?: string): string {
  const at = serverInstant(date, hour);
  if (!at) return "";
  const local = clockTime(at, timeZone);
  return local === clockTime(at, SERVER_TIME_ZONE) ? "" : local;
}

// --- marks -------------------------------------------------------------------------------

function sortHours(hours: readonly number[], order: readonly number[]): number[] {
  return order.filter((hour) => hours.includes(hour));
}

/**
 * The marks the grid starts from: the saved ones, with the user's changes still waiting for
 * the server on top (what they last sent).
 */
export function startingMarks(me: WarMe): Marks {
  const vote = availabilityVote(me);
  const order = vote?.hours ?? [];
  const marks: Marks = { ...me.marks };
  const pending = (me.availability_actions ?? []).filter((a) => a.status === "pending").sort((a, b) => a.id - b.id);
  for (const action of pending) {
    if (action.payload.none) {
      for (const date of vote?.dates ?? []) if (date.editable) delete marks[date.date];
    } else if (action.payload.date) {
      marks[action.payload.date] = sortHours(action.payload.hours ?? [], order);
    }
  }
  for (const [date, hours] of Object.entries(marks)) if (!hours.length) delete marks[date];
  return marks;
}

/**
 * Whether the user answered "none of these days work", counting a pending answer. Marks on
 * dates already decided stay (the answer cannot clear them), so only editable dates count.
 */
export function answeredNone(me: WarMe, marks: Marks): boolean {
  const pendingNone = (me.availability_actions ?? []).some((a) => a.status === "pending" && a.payload.none);
  const editableMarks = (availabilityVote(me)?.dates ?? []).some(
    (date) => date.editable && (marks[date.date]?.length ?? 0) > 0,
  );
  return (pendingNone || me.none === true) && !editableMarks;
}

export function hasMarks(marks: Marks): boolean {
  return Object.values(marks).some((hours) => hours.length > 0);
}

/** Toggle one cell. */
export function toggleCell(marks: Marks, date: string, hour: number, order: readonly number[]): Marks {
  const hours = marks[date] ?? [];
  const next = hours.includes(hour) ? hours.filter((h) => h !== hour) : [...hours, hour];
  return withDate(marks, date, sortHours(next, order));
}

/** Toggle a whole date: every hour on, or all off when every hour already is. */
export function toggleDate(marks: Marks, date: string, order: readonly number[]): Marks {
  const all = order.every((hour) => (marks[date] ?? []).includes(hour));
  return withDate(marks, date, all ? [] : [...order]);
}

function withDate(marks: Marks, date: string, hours: number[]): Marks {
  const next = { ...marks };
  if (hours.length) next[date] = hours;
  else delete next[date];
  return next;
}

function sameHours(a: readonly number[] = [], b: readonly number[] = []): boolean {
  return a.length === b.length && a.every((hour) => b.includes(hour));
}

/** The editable dates whose marks differ between the draft and what was last sent or saved. */
export function changedDates(draft: Marks, base: Marks, dates: readonly AvailabilityDate[]): string[] {
  return dates.filter((d) => d.editable && !sameHours(draft[d.date], base[d.date])).map((d) => d.date);
}

/**
 * The draft after a save the server refused part of, reloaded as `me`: dates that can no
 * longer change show what was saved; the other unsent changes stay for another try. Null
 * when nothing is left to save.
 */
export function reconcileDraft(draft: Marks, me: WarMe): Marks | null {
  const dates = availabilityVote(me)?.dates ?? [];
  const base = startingMarks(me);
  const editable = new Set(dates.filter((d) => d.editable).map((d) => d.date));
  const next: Marks = {};
  for (const date of new Set([...Object.keys(draft), ...Object.keys(base)])) {
    const hours = editable.has(date) ? draft[date] : base[date];
    if (hours?.length) next[date] = hours;
  }
  return changedDates(next, base, dates).length ? next : null;
}

/**
 * The viewer's clock times for one start hour across the dates, in date order and without
 * repeats: one entry normally, two when the dates span a daylight-saving change.
 */
export function localHours(dates: readonly AvailabilityDate[], hour: number, timeZone?: string): string[] {
  const seen: string[] = [];
  for (const date of dates) {
    const local = localHour(date.date, hour, timeZone);
    if (!seen.includes(local)) seen.push(local);
  }
  return seen;
}

export function tallyCell(
  tally: readonly AvailabilityTallyRow[] | null | undefined,
  date: string,
  hour: number,
): AvailabilityTallyRow | null {
  return tally?.find((row) => row.date === date && row.hour === hour) ?? null;
}

// --- words -------------------------------------------------------------------------------

/** The rule under the grid, with the side sizes the plugin uses. */
export function ruleText(need: SidePair | undefined): string {
  const attacker = need?.attacker ?? 3;
  const defender = need?.defender ?? 3;
  const who =
    attacker === defender
      ? `${attacker} of each side`
      : `${attacker} ${attacker === 1 ? "attacker" : "attackers"} and ${defender} ${defender === 1 ? "defender" : "defenders"}`;
  return `A day becomes a battle when ${who} can come at the same time. It's decided 2 days before; the time is decided 1 day before.`;
}

export type DateBadge = { tone: "gold" | "grey" | "open"; text: string };

/** The badge under a date's header. */
export function dateBadge(date: AvailabilityDate): DateBadge {
  if (date.state === "no_battle") return { tone: "grey", text: "No battle" };
  if (date.state === "battle") {
    const at = date.hour !== null ? serverInstant(date.date, date.hour) : null;
    if (at) return { tone: "gold", text: `⚔ Battle ${lockDateTime(at.toISOString())}` };
    const locks = lockLabel(date.time_locks_at);
    return { tone: "gold", text: locks ? `Battle day — time locks ${locks}` : "Battle day" };
  }
  const decided = lockLabel(date.day_locks_at);
  return { tone: "open", text: decided ? `Open — decided ${decided}` : "Open" };
}

/**
 * The next battle with a set time, if any: "⚔ Next battle: Fri 20 Nov, 22:00 CET (23:00 your time)".
 * The day is the calendar day it starts (hour 24 of Fri 20 Nov starts Sat 21 Nov, 00:00).
 * Read from the grid's battle days, else from the war's locked `battle_days`.
 */
export function nextBattleText(
  vote: AvailabilityVote,
  now: Date = new Date(),
  timeZone?: string,
  battleDays?: readonly BattleDay[] | null,
): string | null {
  const fromGrid = (vote.dates ?? []).filter((date) => date.state === "battle" && date.hour !== null);
  // Earliest first, whatever order the dates arrived in.
  const days = [...(fromGrid.length ? fromGrid : (battleDays ?? []))].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.hour ?? 0) - (b.hour ?? 0),
  );
  for (const day of days) {
    if (day.hour === null) continue;
    const at = serverInstant(day.date, day.hour);
    if (!at || at.getTime() < now.getTime() - 3 * 3600_000) continue;
    const local = clockTime(at, timeZone);
    const own = local === clockTime(at, SERVER_TIME_ZONE) ? "" : ` (${local} your time)`;
    return `⚔ Next battle: ${lockDateTime(at.toISOString())}${own}`;
  }
  return null;
}

export type Banner = { tone: "red" | "green" | "grey"; text: string };

/** The user's own status: nothing marked, marked, or "none of these days". */
export function markBanner(vote: AvailabilityVote, marks: Marks, none: boolean): Banner {
  const editable = (vote.dates ?? []).some((d) => d.editable);
  // Before the marks: an answer of "none" leaves the marks on dates already decided.
  if (none)
    return {
      tone: "grey",
      text: "You said none of these days work for you. Mark a time if that changes.",
    };
  if (hasMarks(marks)) {
    const next = lockDateTime(vote.closes_at);
    return {
      tone: "green",
      text: editable
        ? `✔ Marked — you can change it until each day is decided${next ? ` (next: ${next})` : ""}.`
        : "✔ Marked.",
    };
  }
  return { tone: "red", text: "You haven't marked anything" };
}

/**
 * The status line of the user's availability changes: waiting while any is pending, else the
 * newest refusal (with its day) still standing, else "Saved". Old results are forgotten after `forgetMs`.
 */
export function availabilityStatus(
  actions: readonly WarAction[] | null | undefined,
  vote: AvailabilityVote | null,
  now: Date = new Date(),
  forgetMs = 12 * 60 * 60 * 1000,
): ActionStatusView | null {
  const list = [...(actions ?? [])].sort((a, b) => b.id - a.id);
  if (list.some((a) => a.status === "pending")) return { tone: "pending", text: "Waiting for the server…" };
  // Only the newest result per date (or "none" answer) counts: a later change replaces a refusal.
  const seen = new Set<string>();
  const latest = list.filter((a) => {
    const key = a.payload.date ?? (a.payload.none ? "none" : "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const recent = latest.filter((a) => {
    const at = Date.parse(a.applied_at ?? a.created_at ?? "");
    return !Number.isFinite(at) || now.getTime() - at <= forgetMs;
  });
  const refused = recent.find((a) => a.status === "rejected" || a.status === "expired");
  if (refused) {
    const date = refused.payload.date;
    const label = date ? (vote?.dates?.find((d) => d.date === date)?.label ?? date) : null;
    const reason =
      refused.reason || (refused.status === "expired" ? "The server did not answer." : "The server refused this.");
    return { tone: "refused", text: label ? `${label}: ${reason}` : reason };
  }
  return recent.some((a) => a.status === "applied") ? { tone: "done", text: "Saved" } : null;
}
