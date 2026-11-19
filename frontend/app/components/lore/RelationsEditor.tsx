"use client";

import { useRef, useState } from "react";

import {
  createRelation,
  deleteRelation,
  loreErrorMessage,
  RELATION_TYPES,
  updateRelation,
  type Relation,
  type RelationType,
  type SearchResult,
} from "@/lib/lore/api";
import { badgeClass, errorClass, inputClass, mutedClass, quietButtonClass, rowClass } from "../admin/ui";
import { RefLink } from "./DetailParts";
import EntityPicker from "./EntityPicker";

type RelationKind = "character" | "organisation";

const RELATION_LABEL: Record<RelationType, string> = {
  ally: "Ally",
  friendly: "Friendly",
  neutral: "Neutral",
  unfriendly: "Unfriendly",
  hostile: "Hostile",
  rival: "Rival",
  family: "Family",
};

const selectClass = `${inputClass} py-1`;

/**
 * A character's or faction's relations. Outgoing ones (made here) can be added,
 * changed and removed; incoming ones (made on the other record) are shown read-only.
 * Each change is saved at once, then `onChanged` reloads the record.
 */
export default function RelationsEditor({
  sourceKind,
  sourceId,
  relations,
  disabled = false,
  onChanged,
}: {
  sourceKind: RelationKind;
  sourceId: number;
  relations: { outgoing: Relation[]; incoming: Relation[] };
  disabled?: boolean;
  onChanged: () => Promise<void>;
}) {
  const [type, setType] = useState<RelationType>("neutral");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || busy;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function add(result: SearchResult) {
    // Errors here show in the picker.
    setError("");
    await createRelation({
      source_kind: sourceKind,
      source_id: sourceId,
      target_kind: result.kind,
      target_id: result.id,
      type,
      note: note.trim(),
    });
    setNote("");
    await onChanged();
  }

  const exclude = [
    `${sourceKind}:${sourceId}`,
    ...relations.outgoing.map((relation) => `${relation.other.kind}:${relation.other.id}`),
  ];

  return (
    <div className="flex flex-col gap-4">
      {relations.outgoing.length === 0 ? (
        <p className={mutedClass}>No relations yet.</p>
      ) : (
        <ul className={rowClass}>
          {relations.outgoing.map((relation) => (
            <li key={relation.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
              <span className="min-w-0 flex-1">
                <RefLink item={relation.other} showKind />
              </span>
              <select
                className={selectClass}
                value={relation.type}
                aria-label={`Relation with ${relation.other.label}`}
                disabled={locked}
                onChange={(e) => {
                  const next = e.target.value as RelationType;
                  void run(() => updateRelation(relation.id, { type: next }));
                }}
              >
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RELATION_LABEL[t]}
                  </option>
                ))}
              </select>
              <NoteInput
                key={`${relation.id}:${relation.note}`}
                note={relation.note}
                label={relation.other.label}
                disabled={locked}
                onCommit={(next) => run(() => updateRelation(relation.id, { note: next }))}
              />
              <button
                type="button"
                className={quietButtonClass}
                disabled={locked}
                onClick={() => void run(() => deleteRelation(relation.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
      {disabled ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <select
            className={`${inputClass} sm:w-36`}
            value={type}
            aria-label="Type of the new relation"
            onChange={(e) => setType(e.target.value as RelationType)}
          >
            {RELATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {RELATION_LABEL[t]}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} sm:w-56`}
            value={note}
            maxLength={500}
            placeholder="Note (optional)"
            aria-label="Note for the new relation"
            onChange={(e) => setNote(e.target.value)}
          />
          <EntityPicker
            className="min-w-0 flex-1"
            kinds={["character", "organisation"]}
            exclude={exclude}
            onPick={add}
            placeholder="Relate to a character or faction…"
          />
        </div>
      )}
      {relations.incoming.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
            Others towards this
          </h3>
          <ul className={rowClass}>
            {relations.incoming.map((relation) => (
              <li key={relation.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <RefLink item={relation.other} showKind />
                <span
                  className={`${badgeClass} bg-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] text-[var(--tfmc-mist)]`}
                >
                  {RELATION_LABEL[relation.type] ?? relation.type}
                </span>
                {relation.note ? <span className="text-sm text-[var(--tfmc-mist)]">{relation.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** A relation note that saves when it loses focus or on Enter, and resets on Escape. */
function NoteInput({
  note,
  label,
  disabled,
  onCommit,
}: {
  note: string;
  label: string;
  disabled: boolean;
  onCommit: (note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(note);
  const pending = useRef(false);

  function commit() {
    const next = value.trim();
    if (pending.current) return;
    if (next === note) {
      setValue(note);
      return;
    }
    pending.current = true;
    void onCommit(next).then(() => {
      pending.current = false;
      setValue(note);
    });
  }

  return (
    <input
      className={`${inputClass} w-full py-1 sm:w-64`}
      value={value}
      maxLength={500}
      placeholder="Note"
      aria-label={`Note on the relation with ${label}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") setValue(note);
      }}
    />
  );
}
