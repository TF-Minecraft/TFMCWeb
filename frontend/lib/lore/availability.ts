import type { Availability, AvailabilityGrid, DayStatus } from "./api";
import { weekdayOf } from "./dates";

export const AVAILABILITY_LABEL: Record<Availability, string> = { full: "Full", partial: "Partial", none: "None" };

export function availabilityLabel(status: Availability | null | undefined): string {
  return status ? AVAILABILITY_LABEL[status] : "Not set";
}

/** Mirrors effective() in backend/src/lore/availability.py: a day's own entry, else the weekday default. */
export function effectiveDay(
  weekly: { status: Availability | null; note: string }[],
  overrides: Record<string, { status: Availability | null; note: string }>,
  day: string,
): DayStatus {
  const override = overrides[day];
  if (override) return { status: override.status, note: override.note, source: "override" };
  const entry = weekly[weekdayOf(day)];
  if (entry && entry.status) return { status: entry.status, note: entry.note, source: "weekly" };
  return { status: null, note: "", source: null };
}

export type DayCounts = { full: number; partial: number; none: number; unset: number };

export function countDay(grid: AvailabilityGrid | null | undefined, day: string): DayCounts {
  const counts: DayCounts = { full: 0, partial: 0, none: 0, unset: 0 };
  for (const person of grid?.people ?? []) {
    const status = person.days[day]?.status;
    if (status) counts[status] += 1;
    else counts.unset += 1;
  }
  return counts;
}

/** Roster members sorted for picking helpers: Full, then Partial, Not set, None; then by name. */
export function rankForDay<T extends { name: string; status: Availability | null }>(people: T[]): T[] {
  const order = (s: Availability | null) => (s === "full" ? 0 : s === "partial" ? 1 : s === null ? 2 : 3);
  return [...people].sort((a, b) => order(a.status) - order(b.status) || a.name.localeCompare(b.name));
}
