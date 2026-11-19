"use client";

import { use, useEffect, useState } from "react";

import {
  createEntity,
  EVENT_STATUSES,
  getAvailabilityDay,
  loreErrorMessage,
  setEventCharacters,
  setEventHelpers,
  type EventDetail,
  type SearchResult,
} from "@/lib/lore/api";
import { addDays, dayOffset, formatDay, formatStartTimes, isoToZoned, todayIn, zonedToIso } from "@/lib/lore/dates";
import { eventProblem } from "@/lib/lore/eventPlan";
import AdminColumn from "../../../components/admin/AdminColumn";
import {
  chipClass,
  errorClass,
  inputClass,
  mutedClass,
  quietButtonClass,
  warnClass,
} from "../../../components/admin/ui";
import DayAvailability, { type DayPerson } from "../../../components/lore/DayAvailability";
import { Backlinks, DetailHeader, Field, Notice, RefLink, Section } from "../../../components/lore/DetailParts";
import EntityPicker from "../../../components/lore/EntityPicker";
import HistoryList from "../../../components/lore/HistoryList";
import LoreTextEditor from "../../../components/lore/LoreTextEditor";
import SaveBar from "../../../components/lore/SaveBar";
import { statusLabel } from "../../../components/lore/StatusBadge";
import { useEntityEditor } from "../../../components/lore/useEntityEditor";
import { useLoreTimeZone } from "../../../components/lore/useLoreTimeZone";

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = Number(id);
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return (
      <AdminColumn>
        <Notice error>That event doesn’t exist.</Notice>
      </AdminColumn>
    );
  }
  return <EventEditor key={eventId} id={eventId} />;
}

function EventEditor({ id }: { id: number }) {
  const editor = useEntityEditor("event", id);
  const { detail } = editor;
  const zone = useLoreTimeZone();
  // Labels of storylines and locations picked but not saved yet, by "kind:id".
  const [picked, setPicked] = useState<Record<string, string>>({});

  if (!detail) {
    return (
      <AdminColumn>
        {editor.loadError ? <Notice error>{editor.loadError}</Notice> : <Notice>Loading…</Notice>}
      </AdminColumn>
    );
  }

  const locked = Boolean(detail.deleted_at);
  const status = editor.value("status");
  const day = editor.value("scheduled_on");
  const startsAt = editor.value("starts_at");
  const waitingOn = editor.value("waiting_on");
  const storylineId = editor.value("storyline_id");
  const locationId = editor.value("location_id");
  const problem = eventProblem(status, day, waitingOn);

  function pick(field: "storyline_id" | "location_id", result: SearchResult) {
    setPicked((prev) => ({ ...prev, [`${result.kind}:${result.id}`]: result.label }));
    editor.set(field, result.id);
  }

  async function createStoryline(label: string): Promise<SearchResult> {
    const made = await createEntity("storyline", { title: label });
    return { kind: "storyline", id: made.id, label: made.title, sublabel: "", status: made.status };
  }

  /** Store a start time, keeping the saved string when it is the same instant so the form stays clean. */
  function setStart(iso: string | null) {
    const same = iso && detail?.starts_at && Date.parse(iso) === Date.parse(detail.starts_at);
    editor.set("starts_at", same ? detail.starts_at : iso);
  }

  /** Moving the date moves the start by as many days, so a start past midnight stays past midnight. */
  function changeDay(next: string) {
    const nextDay = next || null;
    editor.set("scheduled_on", nextDay);
    if (!nextDay) setStart(null);
    else if (startsAt) {
      const local = isoToZoned(startsAt, zone);
      const startDay = day ? addDays(local.day, dayOffset(day, nextDay)) : nextDay;
      setStart(zonedToIso(startDay, local.time, zone));
    }
  }

  /** A new time keeps the start's own local day, which can be the day after the event's date. */
  function changeTime(next: string) {
    if (!next || !day) setStart(null);
    else setStart(zonedToIso(startsAt ? isoToZoned(startsAt, zone).day : day, next, zone));
  }

  function save() {
    if (problem) editor.setError(problem);
    else void editor.save();
  }

  const storylineLabel =
    storylineId === null
      ? ""
      : storylineId === detail.storyline_id && detail.storyline
        ? detail.storyline.label
        : (picked[`storyline:${storylineId}`] ?? `Storyline #${storylineId}`);
  const savedLocation = locationId !== null && locationId === detail.location_id ? detail.location : null;
  const locationLabel =
    locationId === null ? "" : (savedLocation?.label ?? picked[`location:${locationId}`] ?? `Location #${locationId}`);

  return (
    <AdminColumn>
      <DetailHeader
        kind="event"
        title={editor.value("title")}
        status={status}
        updatedAt={detail.updated_at}
        updatedBy={detail.updated_by_name}
        deletedAt={detail.deleted_at}
        onDelete={editor.remove}
        onRestore={editor.restore}
      >
        {detail.storyline ? (
          <p className="text-sm text-[var(--tfmc-mist)]">
            Part of <RefLink item={detail.storyline} />
          </p>
        ) : null}
      </DetailHeader>

      <Section title="Event">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field label="Title">
              <input
                className={inputClass}
                value={editor.value("title")}
                maxLength={120}
                disabled={locked}
                onChange={(e) => editor.set("title", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={status}
                disabled={locked}
                onChange={(e) => editor.set("status", e.target.value)}
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">Storyline</span>
            {storylineId !== null ? (
              <span className="flex flex-wrap items-center gap-3">
                <RefLink item={{ kind: "storyline", id: storylineId, label: storylineLabel }} />
                {!locked ? (
                  <button type="button" className={quietButtonClass} onClick={() => editor.set("storyline_id", null)}>
                    Clear
                  </button>
                ) : null}
              </span>
            ) : (
              <span className={mutedClass}>Not part of a storyline.</span>
            )}
            {!locked ? (
              <EntityPicker
                kinds={["storyline"]}
                exclude={storylineId !== null ? [`storyline:${storylineId}`] : []}
                placeholder={storylineId !== null ? "Move to another storyline…" : "Pick a storyline…"}
                onPick={(result) => pick("storyline_id", result)}
                onCreate={createStoryline}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">Location</span>
            {locationId !== null ? (
              <span className="flex flex-wrap items-center gap-3">
                <RefLink
                  item={{ kind: "location", id: locationId, label: locationLabel, deleted: savedLocation?.deleted }}
                />
                {savedLocation ? (
                  <span className="text-xs tabular-nums text-[var(--tfmc-stone)]">
                    {savedLocation.world} {savedLocation.x}, {savedLocation.y ?? "~"}, {savedLocation.z}
                  </span>
                ) : null}
                {!locked ? (
                  <button type="button" className={quietButtonClass} onClick={() => editor.set("location_id", null)}>
                    Clear
                  </button>
                ) : null}
              </span>
            ) : (
              <span className={mutedClass}>No location.</span>
            )}
            {!locked ? (
              <>
                <EntityPicker
                  kinds={["location"]}
                  exclude={locationId !== null ? [`location:${locationId}`] : []}
                  placeholder={locationId !== null ? "Change location…" : "Pick a location…"}
                  onPick={(result) => pick("location_id", result)}
                />
                <span className="text-xs text-[var(--tfmc-stone)]">New locations are added on the map.</span>
              </>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="When">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" hint={status === "scheduled" ? "Needed for a scheduled event." : undefined}>
              <input
                type="date"
                className={inputClass}
                value={day ?? ""}
                disabled={locked}
                onChange={(e) => changeDay(e.target.value)}
              />
            </Field>
            <Field label="Start time" hint={day ? `Optional, in your time zone (${zone}).` : "Pick a date first."}>
              <input
                type="time"
                className={inputClass}
                value={startsAt ? isoToZoned(startsAt, zone).time : ""}
                disabled={locked || !day}
                onChange={(e) => changeTime(e.target.value)}
              />
            </Field>
          </div>
          {startsAt ? (
            <p className="text-sm text-[var(--tfmc-cream)]">
              Starts {formatStartTimes(startsAt, zone, day).join(" · ")}
            </p>
          ) : null}
          <Field label="Waiting on" hint={status === "waiting" ? "Needed while the event is waiting." : undefined}>
            <input
              className={inputClass}
              value={waitingOn}
              maxLength={300}
              disabled={locked}
              placeholder="What has to happen before this can be scheduled"
              onChange={(e) => editor.set("waiting_on", e.target.value)}
            />
          </Field>
          {problem ? (
            <p className={warnClass} role="status">
              {problem}
            </p>
          ) : null}
        </div>
      </Section>

      <CharactersSection detail={detail} locked={locked} onChange={editor.replace} />
      <HelpersSection detail={detail} day={day} locked={locked} onChange={editor.replace} />

      <Section title="Write-up">
        <div className="flex flex-col gap-4">
          <LoreTextEditor
            label="Summary"
            value={editor.value("summary")}
            onChange={(v) => editor.set("summary", v)}
            rows={3}
            maxLength={2000}
            placeholder="What happens, in a line or two."
            disabled={locked}
          />
          <LoreTextEditor
            label="Notes"
            value={editor.value("notes")}
            onChange={(v) => editor.set("notes", v)}
            rows={8}
            maxLength={20000}
            disabled={locked}
          />
          <LoreTextEditor
            label="Outcome"
            value={editor.value("outcome")}
            onChange={(v) => editor.set("outcome", v)}
            rows={5}
            maxLength={20000}
            placeholder="What came of it, once it has run."
            disabled={locked}
          />
        </div>
      </Section>

      <Section title="Notifications">
        <p className={mutedClass}>Discord DMs start once the bot is updated.</p>
      </Section>

      <Backlinks items={detail.backlinks} />
      <HistoryList kind="event" id={id} refreshKey={editor.historyKey} />

      <SaveBar
        dirty={editor.dirty}
        saving={editor.saving}
        error={editor.error}
        conflict={Boolean(editor.conflict)}
        onSave={save}
        onDiscard={editor.discard}
        onKeepMine={() => void editor.keepMine()}
        onTakeTheirs={editor.takeTheirs}
      />
    </AdminColumn>
  );
}

/** Runs a link change and hands the fresh event back, keeping its own busy and error state. */
function useLinkSaver(onChange: (next: EventDetail) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<EventDetail>) {
    setBusy(true);
    setError("");
    try {
      onChange(await action());
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run };
}

/** The characters who appear in the event, saved as soon as one is added or removed. */
function CharactersSection({
  detail,
  locked,
  onChange,
}: {
  detail: EventDetail;
  locked: boolean;
  onChange: (next: EventDetail) => void;
}) {
  const { busy, error, run } = useLinkSaver(onChange);
  const ids = detail.characters.map((c) => c.id);

  async function add(result: SearchResult) {
    if (ids.includes(result.id)) return;
    await run(() => setEventCharacters(detail.id, [...ids, result.id]));
  }

  async function createCharacter(label: string): Promise<SearchResult> {
    const made = await createEntity("character", { name: label });
    return { kind: "character", id: made.id, label: made.name, sublabel: "", status: made.status };
  }

  return (
    <Section title="Characters">
      <div className="flex flex-col gap-3">
        {detail.characters.length === 0 ? (
          <p className={mutedClass}>No characters yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {detail.characters.map((item) => (
              <li key={item.id} className={chipClass}>
                <RefLink item={item} />
                {!locked ? (
                  <button
                    type="button"
                    className="ml-1 text-[var(--tfmc-stone)] hover:text-[var(--tfmc-cream)] disabled:opacity-50"
                    disabled={busy}
                    aria-label={`Remove ${item.label}`}
                    onClick={() =>
                      void run(() =>
                        setEventCharacters(
                          detail.id,
                          ids.filter((x) => x !== item.id),
                        ),
                      )
                    }
                  >
                    ×
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {!locked ? (
          <EntityPicker
            kinds={["character"]}
            exclude={ids.map((x) => `character:${x}`)}
            placeholder="Add a character…"
            onPick={add}
            onCreate={createCharacter}
          />
        ) : null}
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Section>
  );
}

type Roster = { day: string; people: DayPerson[]; error: string };

/**
 * Lore team helpers. The roster is listed with each person's availability on the
 * event's date (Full first), so helpers can be picked from who is free.
 */
function HelpersSection({
  detail,
  day,
  locked,
  onChange,
}: {
  detail: EventDetail;
  day: string | null;
  locked: boolean;
  onChange: (next: EventDetail) => void;
}) {
  const { busy, error, run } = useLinkSaver(onChange);
  const [roster, setRoster] = useState<Roster | null>(null);
  // Without a date the roster is still needed to pick helpers; today's copy serves.
  const rosterDay = day ?? todayIn();

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      getAvailabilityDay(rosterDay)
        .then((res) => live && setRoster({ day: rosterDay, people: res.people, error: "" }))
        .catch((err) => live && setRoster({ day: rosterDay, people: [], error: loreErrorMessage(err) }));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [rosterDay]);

  const helperIds = detail.helpers.map((h) => h.user_id);
  const onRoster = new Set(roster?.people.map((p) => p.user_id) ?? []);
  // Helpers who have since left the roster can stay; they are only listed here.
  const offRoster = roster ? detail.helpers.filter((h) => !onRoster.has(h.user_id)) : [];

  function toggle(userId: number, helping: boolean) {
    const next = helping ? [...helperIds, userId] : helperIds.filter((x) => x !== userId);
    void run(() => setEventHelpers(detail.id, next));
  }

  return (
    <Section title="Helpers">
      <div className="flex flex-col gap-3">
        <p className={mutedClass}>
          {detail.helpers.length === 0 ? "No helpers yet." : `Helping: ${detail.helpers.map((h) => h.name).join(", ")}`}
        </p>
        {offRoster.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {offRoster.map((h) => (
              <li key={h.user_id} className={chipClass}>
                {h.name}
                <span className="text-[10px] uppercase tracking-wider text-[var(--tfmc-stone)]">Off roster</span>
                {!locked ? (
                  <button
                    type="button"
                    className="ml-1 text-[var(--tfmc-stone)] hover:text-[var(--tfmc-cream)] disabled:opacity-50"
                    disabled={busy}
                    aria-label={`Remove ${h.name}`}
                    onClick={() => toggle(h.user_id, false)}
                  >
                    ×
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
          {day ? `Who is free on ${formatDay(day, { year: true })}` : "Lore team"}
        </h3>
        {!day ? <p className={mutedClass}>Pick a date to see who is available.</p> : null}
        {roster?.error ? (
          <p className={errorClass} role="alert">
            {roster.error}
          </p>
        ) : !roster ? (
          <p className={mutedClass}>Loading…</p>
        ) : roster.people.length === 0 ? (
          <p className={mutedClass}>Nobody is on the lore team roster yet.</p>
        ) : (
          <div className={roster.day !== rosterDay ? "opacity-60" : ""} aria-busy={roster.day !== rosterDay}>
            <DayAvailability
              people={roster.people}
              showStatus={Boolean(day)}
              helperIds={helperIds}
              disabled={busy}
              onToggle={locked ? undefined : toggle}
            />
          </div>
        )}
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
