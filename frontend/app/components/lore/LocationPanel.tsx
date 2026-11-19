"use client";

import { useEffect, useRef, useState } from "react";

import { createEntity, LOCATION_KINDS, loreErrorMessage, type LocationDetail, type LocationKind } from "@/lib/lore/api";
import { KIND_MARK, MAP_WORLD, parseCoord, tpCommand } from "@/lib/lore/locations";
import { buttonClass, errorClass, inputClass, mutedClass, pagerClass, quietButtonClass } from "../admin/ui";
import { Backlinks, DetailHeader, Field, Notice, RefLink, Section } from "./DetailParts";
import HistoryList from "./HistoryList";
import LoreText from "./LoreText";
import LoreTextEditor from "./LoreTextEditor";
import SaveBar from "./SaveBar";
import { useEntityEditor } from "./useEntityEditor";
import type { MapPoint } from "./LoreMap";

const COORDS = ["x", "y", "z"] as const;
type Coord = (typeof COORDS)[number];

/** Copies the location's /tp command and says so for a moment. */
export function CopyTpButton({ x, y, z }: { x: number; y: number | null; z: number }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const command = tpCommand(x, y, z);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        className={`${pagerClass} self-start font-mono`}
        onClick={() => {
          setFailed(false);
          if (!navigator.clipboard) return setFailed(true);
          navigator.clipboard.writeText(command).then(
            () => setCopied(true),
            () => setFailed(true),
          );
        }}
      >
        {copied ? "Copied" : `Copy ${command}`}
      </button>
      {failed ? <span className={errorClass}>Couldn’t copy. The command is {command}</span> : null}
    </span>
  );
}

function KindTag({ kind }: { kind: LocationKind }) {
  const mark = KIND_MARK[kind] ?? KIND_MARK.other;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold normal-case text-[#10160f]"
        style={{ background: mark.colour }}
      >
        {mark.glyph}
      </span>
      {mark.label}
    </span>
  );
}

function KindSelect({ value, onChange }: { value: LocationKind; onChange: (kind: LocationKind) => void }) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as LocationKind)}>
      {LOCATION_KINDS.map((kind) => (
        <option key={kind} value={kind}>
          {KIND_MARK[kind].label}
        </option>
      ))}
    </select>
  );
}

/** A coordinate held as a number when it is one, and as the typed text while it isn't. */
function coordValue(text: string, optional: boolean): unknown {
  const parsed = parseCoord(text);
  if (parsed === undefined) return text;
  if (parsed === null) return optional ? null : text;
  return parsed;
}

function badCoord(values: Record<Coord, unknown>): string {
  for (const axis of COORDS) {
    const v = values[axis];
    if (v === null && axis === "y") continue;
    if (typeof v !== "number")
      return `${axis.toUpperCase()} must be a whole number${axis === "y" ? " or left empty" : ""}.`;
  }
  return "";
}

/**
 * One location, in the map's side column: what it is, a /tp to it, its events, and
 * an editor for every field, with delete and history.
 */
export default function LocationPanel({
  id,
  onChanged,
}: {
  id: number;
  /** After a save, delete or restore, so the map can redraw its markers. */
  onChanged: (detail: LocationDetail) => void;
}) {
  const editor = useEntityEditor("location", id);
  const { detail } = editor;
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  });
  const lastSeen = useRef<string>("");
  useEffect(() => {
    if (!detail) return;
    const key = `${detail.id}:${detail.version}:${detail.deleted_at ?? ""}`;
    if (lastSeen.current && lastSeen.current !== key) onChangedRef.current(detail);
    lastSeen.current = key;
  }, [detail]);

  if (editor.loadError) return <Notice error>{editor.loadError}</Notice>;
  if (!detail) return <Notice>Loading…</Notice>;

  const deleted = Boolean(detail.deleted_at);
  const coordText = (axis: Coord) => {
    const v = editor.value(axis) as unknown;
    return v === null || v === undefined ? "" : String(v);
  };

  async function save() {
    const problem = badCoord({ x: editor.value("x"), y: editor.value("y"), z: editor.value("z") });
    if (problem) return editor.setError(problem);
    if (!String(editor.value("name") ?? "").trim()) return editor.setError("A location needs a name.");
    await editor.save();
  }

  return (
    <div className="flex flex-col">
      <DetailHeader
        kind="location"
        title={detail.name}
        updatedAt={detail.updated_at}
        updatedBy={detail.updated_by_name}
        deletedAt={detail.deleted_at}
        onDelete={editor.remove}
        onRestore={editor.restore}
      />

      <div className="mt-3 flex flex-col gap-3">
        <KindTag kind={detail.kind} />
        <p className="font-mono text-sm text-[var(--tfmc-cream)]">
          {detail.x}, {detail.y ?? "~"}, {detail.z}
          <span className="ml-2 font-sans text-xs text-[var(--tfmc-stone)]">{detail.world}</span>
        </p>
        {detail.world !== MAP_WORLD ? (
          <p className={mutedClass}>This location is in {detail.world}, so it isn’t drawn on this map.</p>
        ) : null}
        <CopyTpButton x={detail.x} y={detail.y} z={detail.z} />
        <LoreText text={detail.summary} empty="No summary yet." />
      </div>

      <Section title="Events here">
        {detail.events.length === 0 ? (
          <p className={mutedClass}>No events are set here yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {detail.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2">
                <RefLink item={event} />
                {event.scheduled_on ? (
                  <span className="text-xs text-[var(--tfmc-stone)]">{event.scheduled_on}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {detail.storylines.length ? (
          <>
            <h3 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
              Storylines
            </h3>
            <ul className="flex flex-col gap-1.5">
              {detail.storylines.map((item) => (
                <li key={item.id}>
                  <RefLink item={item} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      {!deleted ? (
        <Section title="Edit">
          <div className="flex flex-col gap-3">
            <Field label="Name">
              <input
                className={inputClass}
                value={String(editor.value("name") ?? "")}
                maxLength={120}
                onChange={(e) => editor.set("name", e.target.value)}
              />
            </Field>
            <Field label="Kind">
              <KindSelect value={editor.value("kind")} onChange={(kind) => editor.set("kind", kind)} />
            </Field>
            <Field label="World">
              <input
                className={inputClass}
                value={String(editor.value("world") ?? "")}
                maxLength={64}
                onChange={(e) => editor.set("world", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {COORDS.map((axis) => (
                <Field key={axis} label={axis === "y" ? "Y (optional)" : axis.toUpperCase()}>
                  <input
                    className={`${inputClass} w-full min-w-0`}
                    inputMode="numeric"
                    value={coordText(axis)}
                    onChange={(e) => editor.set(axis, coordValue(e.target.value, axis === "y"))}
                  />
                </Field>
              ))}
            </div>
            <LoreTextEditor
              label="Summary"
              value={String(editor.value("summary") ?? "")}
              onChange={(v) => editor.set("summary", v)}
              rows={3}
            />
            <LoreTextEditor
              label="Notes"
              value={String(editor.value("notes") ?? "")}
              onChange={(v) => editor.set("notes", v)}
              rows={6}
            />
          </div>
        </Section>
      ) : null}

      <Backlinks items={detail.backlinks} />
      <HistoryList kind="location" id={detail.id} refreshKey={editor.historyKey} />

      <SaveBar
        dirty={editor.dirty}
        saving={editor.saving}
        error={editor.error}
        conflict={Boolean(editor.conflict)}
        onSave={() => void save()}
        onDiscard={editor.discard}
        onKeepMine={() => void editor.keepMine()}
        onTakeTheirs={editor.takeTheirs}
      />
    </div>
  );
}

/** The form for a location dropped on the map: name and kind, with the pin's X/Z filled in. */
export function NewLocationForm({
  pin,
  onMove,
  onCreated,
  onCancel,
}: {
  /** Where the map was clicked; null until then (coordinates can also be typed). */
  pin: MapPoint | null;
  /** Typed coordinates move the pin. */
  onMove: (point: MapPoint) => void;
  onCreated: (detail: LocationDetail) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<LocationKind>("settlement");
  const [world, setWorld] = useState(MAP_WORLD);
  const [coords, setCoords] = useState({ x: pin ? String(pin.x) : "", y: "", z: pin ? String(pin.z) : "" });
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A new click on the map moves the pin: take its X/Z, keep the rest.
  const pinX = pin?.x;
  const pinZ = pin?.z;
  useEffect(() => {
    if (pinX === undefined || pinZ === undefined) return;
    setCoords((c) =>
      parseCoord(c.x) === pinX && parseCoord(c.z) === pinZ ? c : { ...c, x: String(pinX), z: String(pinZ) },
    );
  }, [pinX, pinZ]);

  function setCoord(axis: Coord, text: string) {
    const next = { ...coords, [axis]: text };
    setCoords(next);
    const x = parseCoord(next.x);
    const z = parseCoord(next.z);
    if (axis !== "y" && typeof x === "number" && typeof z === "number") onMove({ x, z });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const values = { x: parseCoord(coords.x), y: parseCoord(coords.y), z: parseCoord(coords.z) };
    if (!name.trim()) return setError("A location needs a name.");
    const problem = badCoord(values);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const created = await createEntity("location", {
        name: name.trim(),
        kind,
        world: world.trim() || MAP_WORLD,
        ...values,
        summary,
      });
      onCreated(created);
    } catch (err) {
      setError(loreErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--tfmc-cream)]">New location</h2>
      <p className={mutedClass}>
        {pin ? "Click the map again to move the pin." : "Click the map where it is, or type its coordinates."}
      </p>
      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          maxLength={120}
          required
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Kind">
        <KindSelect value={kind} onChange={setKind} />
      </Field>
      <Field label="World">
        <input className={inputClass} value={world} maxLength={64} onChange={(e) => setWorld(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {COORDS.map((axis) => (
          <Field key={axis} label={axis === "y" ? "Y (optional)" : axis.toUpperCase()}>
            <input
              className={`${inputClass} w-full min-w-0`}
              inputMode="numeric"
              value={coords[axis]}
              placeholder={axis === "y" ? "~" : undefined}
              onChange={(e) => setCoord(axis, e.target.value)}
            />
          </Field>
        ))}
      </div>
      <LoreTextEditor label="Summary" value={summary} onChange={setSummary} rows={3} />
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? "Creating…" : "Create location"}
        </button>
        <button type="button" className={quietButtonClass} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
