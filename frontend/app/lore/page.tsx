"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminColumn from "@/app/components/admin/AdminColumn";
import { mutedClass, rowClass } from "@/app/components/admin/ui";
import AvailabilityQuickSet from "@/app/components/lore/AvailabilityQuickSet";
import { Notice, RefLink, Section } from "@/app/components/lore/DetailParts";
import QuickCreate from "@/app/components/lore/QuickCreate";
import StatusBadge from "@/app/components/lore/StatusBadge";
import {
  getOverview,
  loreErrorMessage,
  type EntityKind,
  type MyAvailability,
  type Overview,
  type RecentEdit,
} from "@/lib/lore/api";
import { browserTimeZone, formatDay, formatInstant, formatStartTimes } from "@/lib/lore/dates";

const ACTION_LABEL: Record<string, string> = {
  created: "created",
  updated: "edited",
  deleted: "deleted",
  restored: "restored",
  added: "added to the team",
  removed: "removed from the team",
  relation_added: "added a relation to",
  relation_changed: "changed a relation on",
  relation_removed: "removed a relation from",
  affiliations_changed: "changed affiliations of",
  members_changed: "changed members of",
  events_reordered: "reordered events of",
  helpers_changed: "changed helpers of",
  characters_changed: "changed characters of",
  player_changed: "changed the linked player of",
  face_uploaded: "uploaded a face for",
  face_removed: "removed the face of",
};

function RecentRow({ entry, zone }: { entry: RecentEdit; zone: string }) {
  const action = ACTION_LABEL[entry.action] ?? entry.action.replace(/_/g, " ");
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-sm">
      <span className="text-[var(--tfmc-cream)]">{entry.actor_name ?? "Someone"}</span>
      <span className="text-[var(--tfmc-mist)]">{action}</span>
      {entry.target ? (
        <RefLink
          item={{
            kind: entry.target.kind as EntityKind,
            id: entry.target.id,
            label: entry.target.label || "Untitled",
            deleted: entry.target.deleted,
          }}
        />
      ) : (
        <span className="text-[var(--tfmc-stone)]">
          {entry.entity_kind} #{entry.entity_id}
        </span>
      )}
      <span className="ml-auto text-xs text-[var(--tfmc-stone)]">{formatInstant(entry.at, zone)}</span>
    </li>
  );
}

export default function LoreOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getOverview()
      .then((overview) => live && setData(overview))
      .catch((err) => live && setError(loreErrorMessage(err)));
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <AdminColumn>
        <Notice error>{error}</Notice>
      </AdminColumn>
    );
  }
  if (!data) {
    return (
      <AdminColumn>
        <Notice>Loading…</Notice>
      </AdminColumn>
    );
  }

  const zone = data.settings.timezone || browserTimeZone();

  function mergeWeek(saved: MyAvailability) {
    const byDay = new Map(saved.days.map((d) => [d.day, d]));
    setData((current) =>
      current
        ? {
            ...current,
            my_week: current.my_week.map((d) => byDay.get(d.day) ?? d),
            settings: saved.settings,
          }
        : current,
    );
  }

  return (
    <AdminColumn>
      <div className="grid gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="min-w-0">
          <Section
            title="Coming up"
            actions={
              <Link
                href="/lore/calendar"
                className="text-sm text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
              >
                Calendar →
              </Link>
            }
          >
            {data.upcoming.length === 0 ? (
              <p className={mutedClass}>Nothing scheduled in the next 14 days.</p>
            ) : (
              <ul className={rowClass}>
                {data.upcoming.map((event) => (
                  <li key={event.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                    <div className="shrink-0 sm:w-40">
                      <p className="text-sm font-semibold text-[var(--tfmc-cream)]">{formatDay(event.scheduled_on)}</p>
                      {event.starts_at ? (
                        <p className="text-xs text-[var(--tfmc-stone)]">
                          {formatStartTimes(event.starts_at, zone).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/lore/events/${event.id}`}
                          className="font-semibold text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
                        >
                          {event.title}
                        </Link>
                        {event.status !== "scheduled" ? <StatusBadge status={event.status} /> : null}
                      </span>
                      <span className="flex flex-wrap gap-x-3 text-xs text-[var(--tfmc-mist)]">
                        {event.storyline ? (
                          <span>
                            Storyline:{" "}
                            <RefLink
                              item={{ kind: "storyline", id: event.storyline.id, label: event.storyline.label }}
                            />
                          </span>
                        ) : null}
                        {event.location ? <span>At {event.location.label}</span> : null}
                        <span>
                          {event.helper_ids.length} helper{event.helper_ids.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Ideas and waiting">
            {data.unscheduled.length === 0 ? (
              <p className={mutedClass}>No events are waiting for a date.</p>
            ) : (
              <ul className={rowClass}>
                {data.unscheduled.map((event) => (
                  <li key={event.id} className="flex flex-col gap-0.5 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/lore/events/${event.id}`}
                        className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
                      >
                        {event.title}
                      </Link>
                      <StatusBadge status={event.status} />
                      {event.storyline_id && event.storyline_title ? (
                        <span className="text-xs text-[var(--tfmc-stone)]">
                          in{" "}
                          <RefLink item={{ kind: "storyline", id: event.storyline_id, label: event.storyline_title }} />
                        </span>
                      ) : null}
                    </span>
                    {event.waiting_on ? (
                      <span className="text-xs text-[var(--tfmc-mist)]">Waiting on: {event.waiting_on}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {data.unscheduled_total > data.unscheduled.length ? (
              <p className={`${mutedClass} mt-2`}>
                Showing {data.unscheduled.length} of {data.unscheduled_total}.{" "}
                <Link href="/lore/calendar" className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline">
                  See them all on the calendar
                </Link>
              </p>
            ) : null}
          </Section>

          <Section title="Recently edited">
            {data.recent.length === 0 ? (
              <p className={mutedClass}>No edits yet.</p>
            ) : (
              <ul className={rowClass}>
                {data.recent.map((entry) => (
                  <RecentRow key={entry.id} entry={entry} zone={zone} />
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="min-w-0">
          <Section title="Add">
            <div className="flex flex-col gap-3">
              <QuickCreate kind="event" placeholder="New event title…" />
              <QuickCreate kind="character" placeholder="New character name…" />
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link href="/lore/storylines" className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline">
                  Storylines
                </Link>
                <Link
                  href="/lore/organisations"
                  className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
                >
                  Factions &amp; orgs
                </Link>
                <Link href="/lore/map" className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline">
                  Map
                </Link>
              </p>
            </div>
          </Section>

          <Section
            title="My availability"
            actions={
              <Link
                href="/lore/calendar#my-availability"
                className="text-sm text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
              >
                Weekly defaults →
              </Link>
            }
          >
            {!data.settings.on_roster ? (
              <p className={`${mutedClass} mb-2`}>
                Setting a day puts you on the roster, so you can be assigned to events.
              </p>
            ) : null}
            <AvailabilityQuickSet days={data.my_week} today={data.today} onSaved={mergeWeek} />
          </Section>
        </div>
      </div>
    </AdminColumn>
  );
}
