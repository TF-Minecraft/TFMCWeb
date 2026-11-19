"use client";

import Link from "next/link";
import { useState } from "react";

import {
  loreErrorMessage,
  setMyDays,
  type Availability,
  type AvailabilityGrid,
  type CalendarEvent,
  type DayStatus,
} from "@/lib/lore/api";
import { availabilityLabel, rankForDay } from "@/lib/lore/availability";
import { formatDay, formatStartTimes } from "@/lib/lore/dates";
import { buttonClass, errorClass, headingClass, inputClass, mutedClass, quietButtonClass, rowClass } from "../admin/ui";
import AvailabilityButtons from "./AvailabilityButtons";
import AvailabilityPill from "./AvailabilityPill";
import { Field, RefLink } from "./DetailParts";
import QuickCreate from "./QuickCreate";
import StatusBadge from "./StatusBadge";

const subheadClass = "mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]";

/**
 * One day of the calendar: its events, everyone's availability, my own entry
 * for the day, and a box to add an event on it. Key it by day so the form resets.
 */
export default function DayPanel({
  day,
  events,
  grid,
  myUserId,
  mine,
  zone,
  onSaved,
  onClose,
}: {
  day: string;
  events: CalendarEvent[];
  grid: AvailabilityGrid | null;
  myUserId: number | null;
  mine: DayStatus | undefined;
  zone: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Availability | null>(mine?.source === "override" ? mine.status : null);
  const [note, setNote] = useState(mine?.source === "override" ? mine.note : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const people = rankForDay(
    (grid?.people ?? []).map((person) => {
      const entry = person.days[day];
      return {
        user_id: person.user_id,
        name: person.name,
        is_lead: person.is_lead,
        status: entry?.status ?? null,
        note: entry?.note ?? "",
      };
    }),
  );
  const names = new Map((grid?.people ?? []).map((p) => [p.user_id, p.name]));

  async function save(next: Availability | null) {
    setBusy(true);
    setError("");
    try {
      await setMyDays([{ day, status: next, note: next ? note.trim() : "" }]);
      if (!next) {
        setStatus(null);
        setNote("");
      }
      onSaved();
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label={`Day: ${formatDay(day)}`}
      className="mt-4 rounded-md border border-[color-mix(in_srgb,var(--tfmc-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] p-4 sm:p-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className={`${headingClass} text-lg`}>{formatDay(day, { year: true })}</h2>
        <button type="button" className={quietButtonClass} onClick={onClose}>
          Close
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className={subheadClass}>Events</h3>
          {events.length === 0 ? (
            <p className={mutedClass}>Nothing scheduled.</p>
          ) : (
            <ul className={rowClass}>
              {events.map((event) => (
                <li key={event.id} className="flex flex-col gap-0.5 py-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/lore/events/${event.id}`}
                      className="font-semibold text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
                    >
                      {event.title}
                    </Link>
                    <StatusBadge status={event.status} />
                  </span>
                  {event.starts_at ? (
                    <span className="text-xs text-[var(--tfmc-cream)]">
                      {formatStartTimes(event.starts_at, zone, event.scheduled_on).join(" · ")}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--tfmc-stone)]">No start time</span>
                  )}
                  <span className="flex flex-wrap gap-x-3 text-xs text-[var(--tfmc-mist)]">
                    {event.storyline ? (
                      <span>
                        Storyline:{" "}
                        <RefLink item={{ kind: "storyline", id: event.storyline.id, label: event.storyline.label }} />
                      </span>
                    ) : null}
                    {event.location ? <span>At {event.location.label}</span> : null}
                    {event.helper_ids.length ? (
                      <span>Helpers: {event.helper_ids.map((id) => names.get(id) ?? `#${id}`).join(", ")}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <h3 className={subheadClass}>Add event on this day</h3>
            <QuickCreate kind="event" extra={{ status: "scheduled", scheduled_on: day }} placeholder="Event title…" />
          </div>
        </div>

        <div className="min-w-0">
          <h3 className={subheadClass}>Who is free</h3>
          {people.length === 0 ? (
            <p className={mutedClass}>No one is on the roster yet.</p>
          ) : (
            <ul className={rowClass}>
              {people.map((person) => (
                <li
                  key={person.user_id}
                  className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 text-sm ${
                    person.user_id === myUserId ? "font-semibold" : ""
                  }`}
                >
                  <span className="text-[var(--tfmc-cream)]">
                    {person.name}
                    {person.user_id === myUserId ? (
                      <span className="ml-1 text-xs text-[var(--tfmc-accent)]">(me)</span>
                    ) : null}
                    {person.is_lead ? <span className="ml-1 text-xs text-[var(--tfmc-stone)]">lead</span> : null}
                  </span>
                  <AvailabilityPill status={person.status} note={person.note} showNote />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <h3 className={subheadClass}>My availability this day</h3>
            <p className="text-xs text-[var(--tfmc-stone)]">
              {mine?.source === "override"
                ? "Set for this day."
                : mine?.source === "weekly"
                  ? `Weekly default: ${availabilityLabel(mine.status)}. Pick a status to set this day on its own.`
                  : "Not set. Pick a status to set this day."}
            </p>
            <AvailabilityButtons
              label={`My availability on ${formatDay(day)}`}
              value={status}
              disabled={busy}
              onChange={(next) => setStatus(next)}
            />
            <Field label="Note">
              <input
                className={inputClass}
                value={note}
                maxLength={200}
                disabled={busy || !status}
                placeholder={status ? "e.g. after 20:00" : "Pick a status first"}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={buttonClass} disabled={busy || !status} onClick={() => save(status)}>
                Save
              </button>
              {mine?.source === "override" ? (
                <button type="button" className={quietButtonClass} disabled={busy} onClick={() => save(null)}>
                  Clear (use weekly default)
                </button>
              ) : null}
            </div>
            {error ? (
              <p className={errorClass} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
