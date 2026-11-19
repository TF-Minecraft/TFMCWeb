"use client";

import { useRef, useState } from "react";

import { loreErrorMessage, type EntityKind, type Ref, type SearchResult } from "@/lib/lore/api";
import { errorClass, inputClass, mutedClass, quietButtonClass, rowClass } from "../admin/ui";
import { RefLink } from "./DetailParts";
import EntityPicker from "./EntityPicker";

export type RoleLink = { id: number; role: string };

/**
 * Linked records, each with a free-text role: a character's factions or a faction's
 * members. Every change sends the whole list through `onSave` (the server replaces
 * the list). Picking a record in the box adds it straight away with no role.
 */
export default function LinkedRoleList({
  items,
  kind,
  disabled = false,
  onSave,
  onCreate,
  empty,
  placeholder,
}: {
  items: (Ref & { role: string })[];
  /** The kind of record linked. */
  kind: Exclude<EntityKind, "location" | "event" | "storyline">;
  disabled?: boolean;
  onSave: (links: RoleLink[]) => Promise<void>;
  /** Makes a new record from a name typed in the picker. */
  onCreate?: (label: string) => Promise<SearchResult>;
  empty: string;
  placeholder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || busy;

  async function send(links: RoleLink[]) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(links);
    } catch (err) {
      setError(loreErrorMessage(err));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  const current = (): RoleLink[] => items.map((item) => ({ id: item.id, role: item.role }));

  async function add(result: SearchResult) {
    if (busy || items.some((item) => item.id === result.id)) return;
    // Errors show in the picker itself.
    setError("");
    setBusy(true);
    try {
      await onSave([...current(), { id: result.id, role: "" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className={mutedClass}>{empty}</p>
      ) : (
        <ul className={rowClass}>
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
              <span className="min-w-0 flex-1">
                <RefLink item={item} />
              </span>
              <RoleInput
                key={`${item.id}:${item.role}`}
                role={item.role}
                label={item.label}
                disabled={locked}
                onCommit={(role) =>
                  send(current().map((link) => (link.id === item.id ? { ...link, role } : link))).catch(() => {})
                }
              />
              <button
                type="button"
                className={quietButtonClass}
                disabled={locked}
                onClick={() => void send(current().filter((link) => link.id !== item.id)).catch(() => {})}
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
        <EntityPicker
          kinds={[kind]}
          exclude={items.map((item) => `${kind}:${item.id}`)}
          onPick={add}
          onCreate={onCreate}
          placeholder={placeholder}
          disabled={busy}
        />
      )}
    </div>
  );
}

/** A role box that saves when it loses focus or on Enter, and resets on Escape. */
function RoleInput({
  role,
  label,
  disabled,
  onCommit,
}: {
  role: string;
  label: string;
  disabled: boolean;
  onCommit: (role: string) => Promise<void>;
}) {
  const [value, setValue] = useState(role);
  const pending = useRef(false);

  function commit() {
    const next = value.trim();
    if (pending.current) return;
    if (next === role) {
      setValue(role);
      return;
    }
    pending.current = true;
    // On success the list re-renders this box with the saved role; on failure it goes back.
    void onCommit(next).then(() => {
      pending.current = false;
      setValue(role);
    });
  }

  return (
    <input
      className={`${inputClass} w-full py-1 sm:w-56`}
      value={value}
      maxLength={80}
      placeholder="Role"
      aria-label={`Role of ${label}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") setValue(role);
      }}
    />
  );
}
