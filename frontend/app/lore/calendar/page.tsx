"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AdminColumn from "@/app/components/admin/AdminColumn";
import { headingClass, mutedClass, pagerClass, rowClass } from "@/app/components/admin/ui";
import DayPanel from "@/app/components/lore/DayPanel";
import { Notice, RefLink, Section } from "@/app/components/lore/DetailParts";
import { useLoreAccess } from "@/app/components/lore/LoreFrame";
import LoreSettingsForm from "@/app/components/lore/LoreSettingsForm";
import MonthGrid from "@/app/components/lore/MonthGrid";
import StatusBadge from "@/app/components/lore/StatusBadge";
import WeekOverride from "@/app/components/lore/WeekOverride";
import WeeklyDefaults from "@/app/components/lore/WeeklyDefaults";
import {
  getCalendar,
  getMyAvailability,
  loreErrorMessage,
  type Calendar,
  type DayStatus,
  type LoreSettings,
  type MyAvailability,
} from "@/lib/lore/api";
import { eventsByDay, gridRange, weekStartOf } from "@/lib/lore/calendar";
import { addMonths, browserTimeZone, formatMonth, monthStart, todayIn } from "@/lib/lore/dates";

type Loaded = { key: string; calendar: Calendar; me: MyAvailability };

export default function LoreCalendarPage() {
  const access = useLoreAccess();
  const myUserId = access.user?.user_id ?? null;

  // LoreFrame only renders pages after a client-side access check, so the browser zone is safe here.
  const [month, setMonth] = useState(() => monthStart(todayIn(browserTimeZone())));
  const [selected, setSelected] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");

  const { from, to, weeks } = useMemo(() => gridRange(month), [month]);
  const key = `${from}|${to}`;

  useEffect(() => {
    let live = true;
    Promise.all([getCalendar(from, to), getMyAvailability(from, to)])
      .then(([calendar, me]) => {
        if (!live) return;
        setLoaded({ key: `${from}|${to}`, calendar, me });
        setError("");
      })
      .catch((err) => live && setError(loreErrorMessage(err)));
    return () => {
      live = false;
    };
  }, [from, to, reloadKey]);

  // Saves answer with a range of their own, so refetch the grid instead of merging.
  const reload = () => setReloadKey((n) => n + 1);

  const settings = loaded?.me.settings ?? null;
  const zone = settings?.timezone || browserTimeZone();
  const today = todayIn(zone);
  const current = loaded?.key === key ? loaded : null;
  const calendar = current?.calendar ?? null;
  const byDay = useMemo(() => eventsByDay(calendar?.events ?? []), [calendar]);
  const mine = useMemo(() => {
    const out: Record<string, DayStatus> = {};
    for (const d of current?.me.days ?? []) out[d.day] = d;
    return out;
  }, [current]);
  const mondays = weeks.map((week) => week[0]);

  function go(next: string) {
    setMonth(next);
    setSelected(null);
  }

  function goToday() {
    setMonth(monthStart(today));
    setSelected(today);
  }

  function mergeSettings(saved: LoreSettings) {
    setLoaded((prev) => (prev ? { ...prev, me: { ...prev.me, settings: saved } } : prev));
    if (saved.on_roster !== settings?.on_roster) reload();
  }

  return (
    <AdminColumn>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`${headingClass} text-2xl`}>{formatMonth(month)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={pagerClass}
            onClick={() => go(addMonths(month, -1))}
            aria-label="Previous month"
          >
            ← Prev
          </button>
          <button type="button" className={pagerClass} onClick={goToday}>
            Today
          </button>
          <button type="button" className={pagerClass} onClick={() => go(addMonths(month, 1))} aria-label="Next month">
            Next →
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-[var(--tfmc-stone)]">
        Times in {zone.replace(/_/g, " ")}. Counts show how many people are Full (F) and Partial (P); the dot is you.
        {current ? null : loaded ? " Loading…" : ""}
      </p>

      {error ? <Notice error>{error}</Notice> : null}

      {!loaded && !error ? (
        <Notice>Loading…</Notice>
      ) : loaded ? (
        <div className="mt-4 grid gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="min-w-0">
            <div className={current ? "" : "opacity-60"}>
              <MonthGrid
                month={month}
                weeks={weeks}
                today={today}
                selected={selected}
                events={byDay}
                grid={calendar?.availability ?? null}
                mine={mine}
                zone={zone}
                onSelect={(day) => setSelected((prev) => (prev === day ? null : day))}
              />
            </div>
            {selected ? (
              <DayPanel
                key={`${selected}|${current ? "ready" : "loading"}`}
                day={selected}
                events={byDay[selected] ?? []}
                grid={calendar?.availability ?? null}
                myUserId={myUserId}
                mine={mine[selected]}
                zone={zone}
                onSaved={reload}
                onClose={() => setSelected(null)}
              />
            ) : (
              <p className={`${mutedClass} mt-3`}>Pick a day to see who is free, set your own day, or add an event.</p>
            )}
          </div>

          <aside className="min-w-0">
            <Section title="Not scheduled yet" className="lg:mt-0">
              {(loaded.calendar.unscheduled ?? []).length === 0 ? (
                <p className={mutedClass}>No ideas or waiting events.</p>
              ) : (
                <ul className={rowClass}>
                  {loaded.calendar.unscheduled.map((event) => (
                    <li key={event.id} className="flex flex-col gap-0.5 py-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/lore/events/${event.id}`}
                          className="text-sm text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
                        >
                          {event.title}
                        </Link>
                        <StatusBadge status={event.status} />
                      </span>
                      {event.waiting_on ? (
                        <span className="text-xs text-[var(--tfmc-mist)]">Waiting on: {event.waiting_on}</span>
                      ) : null}
                      {event.storyline_id && event.storyline_title ? (
                        <span className="text-xs text-[var(--tfmc-stone)]">
                          in{" "}
                          <RefLink item={{ kind: "storyline", id: event.storyline_id, label: event.storyline_title }} />
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </aside>
        </div>
      ) : null}

      {loaded ? (
        <div id="my-availability" className="scroll-mt-6">
          <h2 className={`${headingClass} mt-10 text-2xl`}>My availability</h2>
          {!loaded.me.settings.on_roster ? (
            <p className={`${mutedClass} mt-1`}>
              You are not on the roster yet. Saving any availability or your settings adds you.
            </p>
          ) : null}
          <div className="grid gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <Section title="Weekly defaults">
              <p className={`${mutedClass} mb-2`}>Used for any day you have not set on its own.</p>
              <WeeklyDefaults key={JSON.stringify(loaded.me.weekly)} weekly={loaded.me.weekly} onSaved={reload} />
            </Section>
            <div className="min-w-0">
              <Section title="Set a whole week">
                <WeekOverride
                  key={`${from}|${selected ? weekStartOf(selected) : ""}`}
                  weeks={mondays}
                  initialWeek={weekStartOf(selected ?? today)}
                  onSaved={reload}
                />
              </Section>
              <Section title="Settings">
                <LoreSettingsForm settings={loaded.me.settings} onSaved={mergeSettings} />
              </Section>
            </div>
          </div>
        </div>
      ) : null}
    </AdminColumn>
  );
}
