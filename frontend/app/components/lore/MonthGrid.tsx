"use client";

import Link from "next/link";

import type { AvailabilityGrid, CalendarEvent, DayStatus } from "@/lib/lore/api";
import { availabilityLabel, countDay } from "@/lib/lore/availability";
import { shortStartTime } from "@/lib/lore/calendar";
import { formatDay, formatStartTimes, WEEKDAYS_SHORT } from "@/lib/lore/dates";
import { statusLabel } from "./StatusBadge";

/** Chip colours by event status, matching StatusBadge. */
const CHIP_TONE: Record<string, string> = {
  idea: "bg-[#2c4a63] text-[#cfe3f5]",
  waiting: "bg-[#6b5326] text-[#f5e2b8]",
  scheduled: "bg-[#2f5d3a] text-[#cdeccf]",
  done: "bg-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)] text-[var(--tfmc-mist)]",
  cancelled: "bg-[#5e2f2f] text-[#f2cccc] line-through",
};

/** A small mark for my own status on a day. */
const MY_DOT: Record<string, string> = {
  full: "bg-[#6fbf7f]",
  partial: "bg-[#d9a94a]",
  none: "bg-[#c46a6a]",
  unset: "border border-[color-mix(in_srgb,var(--tfmc-cream)_35%,transparent)]",
};

/**
 * A Monday-first month: each day shows its number, my own status, how many
 * people are Full / Partial, and its events as chips linking to them.
 */
export default function MonthGrid({
  month,
  weeks,
  today,
  selected,
  events,
  grid,
  mine,
  zone,
  onSelect,
}: {
  /** First day of the shown month. */
  month: string;
  weeks: string[][];
  today: string;
  selected: string | null;
  events: Record<string, CalendarEvent[]>;
  grid: AvailabilityGrid | null;
  /** My effective status per day. */
  mine: Record<string, DayStatus>;
  zone: string;
  onSelect: (day: string) => void;
}) {
  const monthKey = month.slice(0, 7);

  return (
    <div className="overflow-hidden rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)]">
      <div className="grid grid-cols-7 bg-[color-mix(in_srgb,var(--tfmc-forest)_70%,transparent)] text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
        {WEEKDAYS_SHORT.map((name) => (
          <div key={name} className="py-1.5">
            {name}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div
          key={week[0]}
          className="grid grid-cols-7 border-t border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)]"
        >
          {week.map((day, i) => {
            const inMonth = day.startsWith(monthKey);
            const dayEvents = events[day] ?? [];
            const counts = countDay(grid, day);
            const my = mine[day];
            const isToday = day === today;
            const isSelected = day === selected;
            return (
              <div
                key={day}
                className={`flex min-h-16 min-w-0 flex-col gap-1 p-1 sm:min-h-24 sm:p-1.5 ${
                  i > 0 ? "border-l border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)]" : ""
                } ${inMonth ? "" : "opacity-45"} ${
                  isSelected
                    ? "bg-[color-mix(in_srgb,var(--tfmc-accent)_14%,transparent)] ring-1 ring-inset ring-[var(--tfmc-accent)]"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(day)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDay(day)}: ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}, ${counts.full} full, ${counts.partial} partial, me ${availabilityLabel(my?.status)}`}
                  className="flex w-full flex-col items-stretch gap-0.5 rounded-sm text-left outline-none hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_6%,transparent)] focus-visible:ring-1 focus-visible:ring-[var(--tfmc-accent)]"
                >
                  <span className="flex items-center justify-between gap-1">
                    <span
                      className={`text-sm tabular-nums ${
                        isToday
                          ? "rounded-sm bg-[var(--tfmc-accent)] px-1 font-semibold text-[var(--tfmc-forest-deep)]"
                          : "text-[var(--tfmc-cream)]"
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <span
                      className={`size-2 shrink-0 rounded-full ${MY_DOT[my?.status ?? "unset"]}`}
                      title={`Me: ${availabilityLabel(my?.status)}${my?.note ? ` · ${my.note}` : ""}`}
                    />
                  </span>
                  {counts.full || counts.partial ? (
                    <span className="text-[10px] leading-tight tabular-nums text-[var(--tfmc-mist)]">
                      <span className="text-[#9fd9a9]">{counts.full}F</span>{" "}
                      <span className="text-[#e7c788]">{counts.partial}P</span>
                    </span>
                  ) : (
                    <span className="text-[10px] leading-tight text-[var(--tfmc-stone)]">&nbsp;</span>
                  )}
                  {dayEvents.length ? (
                    <span className="text-[10px] font-semibold text-[var(--tfmc-accent)] sm:hidden">
                      {dayEvents.length} ev
                    </span>
                  ) : null}
                </button>
                <ul className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {dayEvents.map((event) => {
                    const time = shortStartTime(event.starts_at, zone, event.scheduled_on);
                    const times = event.starts_at
                      ? formatStartTimes(event.starts_at, zone, event.scheduled_on).join(" · ")
                      : "";
                    return (
                      <li key={event.id} className="min-w-0">
                        <Link
                          href={`/lore/events/${event.id}`}
                          title={`${event.title} (${statusLabel(event.status)})${times ? ` · ${times}` : ""}`}
                          className={`block truncate rounded-sm px-1 py-0.5 text-[11px] leading-tight hover:opacity-85 ${
                            CHIP_TONE[event.status] ?? CHIP_TONE.done
                          }`}
                        >
                          {time ? <span className="mr-1 tabular-nums opacity-80">{time}</span> : null}
                          {event.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
