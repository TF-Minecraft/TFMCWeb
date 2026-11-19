/** Calendar days are ISO strings (YYYY-MM-DD); day arithmetic is done in UTC so DST can't shift it. */

const DAY_MS = 86_400_000;

function toUtc(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value;
}

/** Today in the given time zone (the browser's by default). */
export function todayIn(timeZone?: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function dayOffset(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function daysBetween(first: string, last: string): string[] {
  const out: string[] = [];
  for (let ms = toUtc(first); ms <= toUtc(last); ms += DAY_MS) out.push(fromUtc(ms));
  return out;
}

/** 0 = Monday … 6 = Sunday, as Python's date.weekday(). */
export function weekdayOf(day: string): number {
  return (new Date(toUtc(day)).getUTCDay() + 6) % 7;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The first day of the month `day` falls in. */
export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUtc(d.getTime());
}

/** Whole weeks (Monday first) covering the month that starts at `month` (YYYY-MM-01). */
export function monthGrid(month: string): string[][] {
  const first = addDays(month, -weekdayOf(month));
  const lastOfMonth = addDays(addMonths(month, 1), -1);
  const last = addDays(lastOfMonth, 6 - weekdayOf(lastOfMonth));
  const days = daysBetween(first, last);
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function formatDay(day: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: opts.weekday === false ? undefined : "short",
    day: "numeric",
    month: "short",
    year: opts.year ? "numeric" : undefined,
  }).format(new Date(toUtc(day)));
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(toUtc(month)),
  );
}

// --------------------
// Time zones
// --------------------

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Minutes `timeZone` is ahead of UTC at `instant`. */
export function zoneOffsetMinutes(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000);
}

/**
 * The instant (ISO, UTC) of wall-clock `time` (HH:MM) on `day` in `timeZone`, or null when
 * that time doesn't exist there (skipped when the clocks go forward).
 */
export function zonedToIso(day: string, time: string, timeZone: string): string | null {
  const [h, m] = time.split(":").map(Number);
  const wall = toUtc(day) + (h * 60 + m) * 60_000;
  let instant = wall - zoneOffsetMinutes(wall, timeZone) * 60_000;
  // A second pass settles times near a DST change.
  instant = wall - zoneOffsetMinutes(instant, timeZone) * 60_000;
  const iso = new Date(instant).toISOString().replace(".000Z", "Z");
  const back = isoToZoned(iso, timeZone);
  return back.day === day && back.time === time ? iso : null;
}

/** The calendar day and HH:MM an instant falls on in `timeZone`. */
export function isoToZoned(iso: string, timeZone: string): { day: string; time: string } {
  const instant = new Date(iso).getTime();
  const shifted = new Date(instant + zoneOffsetMinutes(instant, timeZone) * 60_000);
  return { day: shifted.toISOString().slice(0, 10), time: shifted.toISOString().slice(11, 16) };
}

/** Reference zones shown beside every start time. */
export const REFERENCE_ZONES = [
  { zone: "Europe/Berlin", names: ["CET", "CEST"] },
  { zone: "America/New_York", names: ["EST", "EDT"] },
] as const;

function zoneAbbreviation(instant: number, zone: string): string {
  const ref = REFERENCE_ZONES.find((r) => r.zone === zone);
  if (ref) {
    const january = zoneOffsetMinutes(Date.UTC(new Date(instant).getUTCFullYear(), 0, 1), zone);
    return zoneOffsetMinutes(instant, zone) === january ? ref.names[0] : ref.names[1];
  }
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "short" })
    .formatToParts(new Date(instant))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? zone;
}

/** "19:00 CET" — the time an instant shows in `zone`, with a day hint when it differs from `onDay`. */
export function formatTimeIn(iso: string, zone: string, onDay?: string): string {
  const { day, time } = isoToZoned(iso, zone);
  const instant = new Date(iso).getTime();
  const hint = onDay && day !== onDay ? ` (${formatDay(day)})` : "";
  return `${time} ${zoneAbbreviation(instant, zone)}${hint}`;
}

/**
 * The start time in the viewer's zone followed by CET and EST, skipping repeats. Each gets a
 * day hint when it falls on another day than `scheduledOn` (the event's day), or, without
 * one, than the local time's day.
 */
export function formatStartTimes(iso: string, localZone: string, scheduledOn?: string | null): string[] {
  const onDay = scheduledOn || isoToZoned(iso, localZone).day;
  const zones = [localZone, ...REFERENCE_ZONES.map((r) => r.zone).filter((z) => z !== localZone)];
  return zones.map((zone) => formatTimeIn(iso, zone, onDay));
}

/** A stored instant (ISO), shown as "19 Nov 2026, 14:05" in the viewer's zone. */
export function formatInstant(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(at);
}
