"use client";

import { useEffect, useState } from "react";

import { getHistory, loreErrorMessage, type EntityKind, type HistoryEntry } from "@/lib/lore/api";
import { formatInstant } from "@/lib/lore/dates";
import { errorClass, headingClass, mutedClass, panelClass } from "../admin/ui";

const ACTION_LABEL: Record<string, string> = {
  created: "created this",
  updated: "edited",
  deleted: "deleted this",
  restored: "restored this",
  relation_added: "added a relation",
  relation_changed: "changed a relation",
  relation_removed: "removed a relation",
  affiliations_changed: "changed affiliations",
  members_changed: "changed members",
  events_reordered: "reordered events",
  helpers_changed: "changed helpers",
  signed_up: "signed up to help",
  withdrew: "withdrew as a helper",
  characters_changed: "changed characters",
  player_changed: "changed the linked player",
  face_uploaded: "uploaded a face",
  face_removed: "removed the face",
};

// Change keys that hold a list of items rather than an [old, new] pair.
const LIST_KEYS = new Set(["added", "removed", "role_changed"]);

/** The record's edit history, fetched the first time it is opened and again when `refreshKey` changes. */
export default function HistoryList({
  kind,
  id,
  refreshKey = 0,
}: {
  kind: EntityKind;
  id: number;
  refreshKey?: number;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let live = true;
    getHistory(kind, id)
      .then((rows) => live && (setEntries(rows), setError("")))
      .catch((err) => live && setError(loreErrorMessage(err)));
    return () => {
      live = false;
    };
  }, [open, kind, id, refreshKey]);

  return (
    <details className={panelClass} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className={`${headingClass} cursor-pointer select-none text-lg`}>History</summary>
      <div className="mt-3">
        {error ? <p className={errorClass}>{error}</p> : null}
        {!entries && !error ? <p className={mutedClass}>Loading…</p> : null}
        {entries && entries.length === 0 ? <p className={mutedClass}>No history yet.</p> : null}
        {entries && entries.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="text-[var(--tfmc-cream)]">
                  <span className="font-semibold">{entry.actor_name ?? "Someone"}</span>{" "}
                  {ACTION_LABEL[entry.action] ?? entry.action.replace(/_/g, " ")}
                  <span className="text-[var(--tfmc-stone)]"> · {formatInstant(entry.at)}</span>
                </p>
                <ChangeList changes={entry.changes} />
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </details>
  );
}

function ChangeList({ changes }: { changes: HistoryEntry["changes"] }) {
  const fields = Object.entries(changes ?? {});
  if (fields.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5 pl-3 text-xs text-[var(--tfmc-mist)]">
      {fields.map(([field, change]) => (
        <li key={field} className="break-words">
          <span className="text-[var(--tfmc-stone)]">{field.replace(/_/g, " ")}:</span> {describe(field, change)}
        </li>
      ))}
    </ul>
  );
}

function describe(field: string, change: unknown): string {
  if (LIST_KEYS.has(field) || !Array.isArray(change) || change.length !== 2) return show(change);
  return `${show(change[0])} → ${show(change[1])}`;
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(show).join(", ") : "—";
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (v.target && typeof v.target === "object") {
      return `${String(v.type ?? "")} → ${show(v.target)}${v.note ? ` (${String(v.note)})` : ""}`;
    }
    if (typeof v.label === "string") {
      const role = Array.isArray(v.role) ? `${show(v.role[0])} → ${show(v.role[1])}` : v.role ? String(v.role) : "";
      return role ? `${v.label} (${role})` : v.label;
    }
    if (typeof v.name === "string") return v.name;
    return JSON.stringify(value);
  }
  const text = String(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}
