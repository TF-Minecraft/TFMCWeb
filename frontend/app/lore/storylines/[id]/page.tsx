"use client";

import { use, useState } from "react";

import {
  createEntity,
  LoreApiError,
  setStorylineMembers,
  setStorylineOrder,
  STORYLINE_STATUSES,
  type EntityKind,
  type Ref,
  type SearchResult,
  type StorylineDetail,
} from "@/lib/lore/api";
import { moveItem, sameOrder, sortByDate } from "@/lib/lore/eventPlan";
import AdminColumn from "../../../components/admin/AdminColumn";
import {
  chipClass,
  errorClass,
  inputClass,
  mutedClass,
  pagerClass,
  quietButtonClass,
} from "../../../components/admin/ui";
import { Backlinks, DetailHeader, Field, Notice, RefLink, Section } from "../../../components/lore/DetailParts";
import EntityPicker from "../../../components/lore/EntityPicker";
import EventList from "../../../components/lore/EventList";
import HistoryList from "../../../components/lore/HistoryList";
import LoreTextEditor from "../../../components/lore/LoreTextEditor";
import QuickCreate from "../../../components/lore/QuickCreate";
import SaveBar from "../../../components/lore/SaveBar";
import { statusLabel } from "../../../components/lore/StatusBadge";
import { useEntityEditor } from "../../../components/lore/useEntityEditor";
import { useLinkSaver, type LinkSaver } from "../../../components/lore/useLinkSaver";
import { useLoreTimeZone } from "../../../components/lore/useLoreTimeZone";

type MemberKind = "character" | "organisation" | "location";

const MEMBER_GROUPS: { kind: MemberKind; title: string; empty: string; placeholder: string }[] = [
  { kind: "character", title: "Characters", empty: "No characters yet.", placeholder: "Add a character…" },
  {
    kind: "organisation",
    title: "Factions & organisations",
    empty: "No factions yet.",
    placeholder: "Add a faction or organisation…",
  },
  { kind: "location", title: "Locations", empty: "No locations yet.", placeholder: "Add a location…" },
];

export default function StorylinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const storylineId = Number(id);
  if (!Number.isSafeInteger(storylineId) || storylineId <= 0) {
    return (
      <AdminColumn>
        <Notice error>That storyline doesn’t exist.</Notice>
      </AdminColumn>
    );
  }
  return <StorylineEditor key={storylineId} id={storylineId} />;
}

function StorylineEditor({ id }: { id: number }) {
  const editor = useEntityEditor("storyline", id);
  const { detail } = editor;
  // Members and event order share one saver, so their whole-record answers can't cross.
  const links = useLinkSaver(editor.replace);

  if (!detail) {
    return (
      <AdminColumn>
        {editor.loadError ? <Notice error>{editor.loadError}</Notice> : <Notice>Loading…</Notice>}
      </AdminColumn>
    );
  }

  const locked = Boolean(detail.deleted_at);

  return (
    <AdminColumn>
      <DetailHeader
        kind="storyline"
        title={editor.value("title")}
        status={editor.value("status")}
        updatedAt={detail.updated_at}
        updatedBy={detail.updated_by_name}
        deletedAt={detail.deleted_at}
        onDelete={editor.remove}
        onRestore={editor.restore}
      />

      <Section title="Details">
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
                value={editor.value("status")}
                disabled={locked}
                onChange={(e) => editor.set("status", e.target.value)}
              >
                {STORYLINE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <LoreTextEditor
            label="Summary"
            value={editor.value("summary")}
            onChange={(v) => editor.set("summary", v)}
            rows={3}
            maxLength={2000}
            placeholder="What the storyline is about, in a line or two."
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
        </div>
      </Section>

      <MembersSection detail={detail} locked={locked} links={links} />

      <EventsSection detail={detail} locked={locked} links={links} reload={editor.reload} />

      <Backlinks items={detail.backlinks} />
      <HistoryList kind="storyline" id={id} refreshKey={editor.historyKey} />

      <SaveBar
        dirty={editor.dirty}
        saving={editor.saving}
        error={editor.error}
        conflict={Boolean(editor.conflict)}
        onSave={() => void editor.save()}
        onDiscard={editor.discard}
        onKeepMine={() => void editor.keepMine()}
        onTakeTheirs={editor.takeTheirs}
      />
    </AdminColumn>
  );
}

/** The characters, factions and locations involved, saved as soon as one is added or removed. */
function MembersSection({
  detail,
  locked,
  links,
}: {
  detail: StorylineDetail;
  locked: boolean;
  links: LinkSaver<StorylineDetail>;
}) {
  const { busy } = links;
  const error = links.errorFor("members");
  const members = detail.members;
  const chosen = members.map((m) => `${m.kind}:${m.id}`);

  async function save(next: Ref[]) {
    await links.run("members", () =>
      setStorylineMembers(
        detail.id,
        next.map((m) => ({ kind: m.kind, id: m.id })),
      ),
    );
  }

  async function add(result: SearchResult) {
    if (busy || chosen.includes(`${result.kind}:${result.id}`)) return;
    await save([...members, { kind: result.kind, id: result.id, label: result.label }]);
  }

  function creator(kind: MemberKind) {
    if (kind === "location") return undefined;
    return async (label: string): Promise<SearchResult> => {
      const made =
        kind === "character"
          ? await createEntity("character", { name: label })
          : await createEntity("organisation", { name: label });
      return { kind, id: made.id, label: made.name, sublabel: "", status: null };
    };
  }

  return (
    <Section title="Involved">
      <div className="flex flex-col gap-5">
        {MEMBER_GROUPS.map((group) => {
          const items = members.filter((m) => m.kind === group.kind);
          return (
            <div key={group.kind} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">{group.title}</h3>
              {items.length === 0 ? (
                <p className={mutedClass}>{group.empty}</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <li key={item.id} className={chipClass}>
                      <RefLink item={item} />
                      {!locked ? (
                        <button
                          type="button"
                          className="ml-1 text-[var(--tfmc-stone)] hover:text-[var(--tfmc-cream)] disabled:opacity-50"
                          disabled={busy}
                          aria-label={`Remove ${item.label}`}
                          onClick={() => void save(members.filter((m) => !(m.kind === item.kind && m.id === item.id)))}
                        >
                          ×
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {!locked ? (
                <>
                  <EntityPicker
                    kinds={[group.kind as EntityKind]}
                    exclude={chosen}
                    placeholder={group.placeholder}
                    disabled={busy}
                    onPick={add}
                    onCreate={creator(group.kind)}
                  />
                  {group.kind === "location" ? (
                    <p className="text-xs text-[var(--tfmc-stone)]">New locations are added on the map.</p>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Section>
  );
}

/** The storyline's events in story order, with reordering and a quick way to add one. */
function EventsSection({
  detail,
  locked,
  links,
  reload,
}: {
  detail: StorylineDetail;
  locked: boolean;
  links: LinkSaver<StorylineDetail>;
  /** Fetches the storyline again, keeping the draft; null when that failed. */
  reload: () => Promise<StorylineDetail | null>;
}) {
  const zone = useLoreTimeZone();
  const { busy } = links;
  const error = links.errorFor("events");
  // An event was created but the storyline couldn't be fetched again to show it.
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const events = detail.events;
  const ids = events.map((e) => e.id);
  const byDate = sortByDate(events);

  async function order(next: number[]) {
    if (busy || sameOrder(next, ids)) return;
    await links.run(
      "events",
      () => setStorylineOrder(detail.id, next),
      async (err) => {
        // Someone added or removed an event since: fetch the current list so a retry can work.
        if (!(err instanceof LoreApiError && err.code === "bad_order")) return;
        if (await reload()) return "Someone changed the event list. It’s been refreshed; try again.";
      },
    );
  }

  async function refresh() {
    setRefreshing(true);
    const fresh = await reload();
    setRefreshing(false);
    setStale(!fresh);
  }

  return (
    <Section
      title="Events"
      actions={
        !locked && events.length > 1 ? (
          <button
            type="button"
            className={pagerClass}
            disabled={busy || sameOrder(byDate, ids)}
            onClick={() => void order(byDate)}
          >
            Sort by date
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {events.length === 0 ? (
          <p className={mutedClass}>No events yet.</p>
        ) : (
          <EventList
            events={events}
            timeZone={zone}
            disabled={busy}
            onMove={locked ? undefined : (index, delta) => void order(moveItem(ids, index, delta))}
          />
        )}
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
        {stale ? (
          <p className={`${errorClass} flex flex-wrap items-center gap-3`} role="alert">
            The event was added, but the list couldn’t be refreshed.
            <button type="button" className={quietButtonClass} disabled={refreshing} onClick={() => void refresh()}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </p>
        ) : null}
        {!locked ? (
          <QuickCreate
            kind="event"
            extra={{ storyline_id: detail.id }}
            placeholder="Add an event to this storyline…"
            onCreated={() => void refresh()}
          />
        ) : null}
      </div>
    </Section>
  );
}
