"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createEntity, entityHref, KIND_LABEL, loreErrorMessage, type EntityKind } from "@/lib/lore/api";
import { buttonClass, errorClass, inputClass } from "../admin/ui";

/**
 * One box and a button: makes a record from just its name (or title) and opens it,
 * so adding something takes one step and the rest is filled in on its page.
 */
export default function QuickCreate({
  kind,
  extra = {},
  placeholder,
  onCreated,
}: {
  kind: Exclude<EntityKind, "location">;
  extra?: Record<string, unknown>;
  placeholder?: string;
  /** Called instead of navigating, e.g. to add the new record to a list in place. */
  onCreated?: (id: number) => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = kind === "storyline" || kind === "event" ? "title" : "name";
  const noun = KIND_LABEL[kind].toLowerCase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = label.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      const made = await createEntity(kind, { ...extra, [field]: text });
      setLabel("");
      if (onCreated) onCreated(made.id);
      else router.push(entityHref(kind, made.id));
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1`}
          value={label}
          maxLength={120}
          placeholder={placeholder ?? `New ${noun} ${field}…`}
          aria-label={`New ${noun} ${field}`}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button type="submit" className={buttonClass} disabled={busy || !label.trim()}>
          {busy ? "Adding…" : `Add ${noun}`}
        </button>
      </div>
      {error ? <p className={errorClass}>{error}</p> : null}
    </form>
  );
}
