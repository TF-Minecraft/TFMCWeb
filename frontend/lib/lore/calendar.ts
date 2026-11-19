import type { Availability } from "./api";
import { addDays, daysBetween, formatDay, isoToZoned, monthGrid, weekdayOf } from "./dates";

/** The Monday of the week `day` falls in. */
export function weekStartOf(day: string): string {
  return addDays(day, -weekdayOf(day));
}

/** The seven days (Monday first) of the week `day` falls in. */
export function weekOf(day: string): string[] {
  const first = weekStartOf(day);
  return daysBetween(first, addDays(first, 6));
}

/** "16 Nov – 22 Nov" for the week starting `monday`. */
export function weekLabel(monday: string): string {
  return `${formatDay(monday, { weekday: false })} – ${formatDay(addDays(monday, 6), { weekday: false })}`;
}

/** The first and last day shown by the month grid (whole Monday-first weeks), at most 42 days. */
export function gridRange(month: string): { from: string; to: string; weeks: string[][] } {
  const weeks = monthGrid(month);
  return { from: weeks[0][0], to: weeks[weeks.length - 1][6], weeks };
}

/** Events grouped by their scheduled day, keeping the order they came in. */
export function eventsByDay<T extends { scheduled_on: string | null }>(events: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const event of events) {
    if (!event.scheduled_on) continue;
    (out[event.scheduled_on] ??= []).push(event);
  }
  return out;
}

/** The PUT /availability/me/days body that sets (or with null clears) a whole week. */
export function weekOverride(
  day: string,
  status: Availability | null,
  note = "",
): { day: string; status: Availability | null; note: string }[] {
  const text = status ? note.trim() : "";
  return weekOf(day).map((d) => ({ day: d, status, note: text }));
}

/** Time zones for a picker: the supported list (when the browser has one), always including `current`, sorted. */
export function timeZoneChoices(current: string, supported?: readonly string[] | null): string[] {
  const zones = new Set(supported && supported.length ? supported : ["UTC", "Europe/Berlin", "America/New_York"]);
  if (current) zones.add(current);
  return [...zones].sort((a, b) => a.localeCompare(b));
}

/** The browser's list of IANA zones, or null where Intl.supportedValuesOf is missing. */
export function supportedTimeZones(): string[] | null {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    return typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : null;
  } catch {
    return null;
  }
}

/** "19:00" in `zone`, with the local day appended when it is not the event's scheduled day. */
export function shortStartTime(startsAt: string | null, zone: string, scheduledOn: string): string {
  if (!startsAt) return "";
  const { day, time } = isoToZoned(startsAt, zone);
  return day === scheduledOn ? time : `${time} (${formatDay(day)})`;
}
