/** Pure helpers for planning events: storyline order, when an event happens, and the status rules. */

import { formatDay, formatTimeIn } from "./dates";

/** `list` with the item at `index` moved `delta` places (clamped); the same list when it can't move. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = Math.min(Math.max(index + delta, 0), list.length - 1);
  if (index < 0 || index >= list.length || target === index) return [...list];
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

/** Ids in date order (start time breaks ties), undated ones last in their current order. */
export function sortByDate(
  events: readonly { id: number; scheduled_on: string | null; starts_at: string | null }[],
): number[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const ad = a.event.scheduled_on;
      const bd = b.event.scheduled_on;
      if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      if (ad && bd) {
        const at = a.event.starts_at ? Date.parse(a.event.starts_at) : Infinity;
        const bt = b.event.starts_at ? Date.parse(b.event.starts_at) : Infinity;
        if (at !== bt) return at < bt ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ event }) => event.id);
}

export function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** "Fri 20 Nov 2026, 19:00 CET", "Waiting on: the war to end", or "No date yet". */
export function eventWhen(
  event: { status: string; scheduled_on: string | null; starts_at: string | null; waiting_on: string },
  timeZone: string,
): string {
  if (event.scheduled_on) {
    const day = formatDay(event.scheduled_on, { year: true });
    return event.starts_at ? `${day}, ${formatTimeIn(event.starts_at, timeZone, event.scheduled_on)}` : day;
  }
  if (event.status === "waiting" || event.waiting_on.trim()) {
    return `Waiting on: ${event.waiting_on.trim() || "not said"}`;
  }
  return "No date yet";
}

/** Mirrors _check_event in backend/src/lore/entities.py; empty when the event can be saved. */
export function eventProblem(status: string, scheduledOn: string | null, waitingOn: string): string {
  if (status === "scheduled" && !scheduledOn) return "Pick a date to mark the event as scheduled.";
  if (status === "waiting" && !waitingOn.trim()) return "Say what the event is waiting on.";
  return "";
}
