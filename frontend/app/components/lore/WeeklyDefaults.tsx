"use client";

import { useState } from "react";

import { loreErrorMessage, setMyWeekly, type Availability, type MyAvailability } from "@/lib/lore/api";
import { WEEKDAYS } from "@/lib/lore/dates";
import { buttonClass, errorClass, inputClass, rowClass } from "../admin/ui";
import AvailabilityButtons from "./AvailabilityButtons";

type Entry = { status: Availability | null; note: string };

/** Seven entries, Monday first, whatever the server sent. */
function draftFrom(weekly: MyAvailability["weekly"]): Entry[] {
  return WEEKDAYS.map((_, i) => {
    const found = weekly.find((w) => w.weekday === i);
    return { status: found?.status ?? null, note: found?.note ?? "" };
  });
}

/**
 * Full / Partial / None / Not set for each weekday, with a note. Days without
 * their own entry use these. Key it by the saved weekly list to reset the draft.
 */
export default function WeeklyDefaults({
  weekly,
  onSaved,
}: {
  weekly: MyAvailability["weekly"];
  onSaved: (saved: MyAvailability) => void;
}) {
  const [draft, setDraft] = useState<Entry[]>(() => draftFrom(weekly));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(weekly));

  function update(i: number, patch: Partial<Entry>) {
    setSaved(false);
    setDraft((current) => current.map((entry, j) => (j === i ? { ...entry, ...patch } : entry)));
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await setMyWeekly(draft.map((d) => ({ status: d.status, note: d.status ? d.note.trim() : "" })));
      setSaved(true);
      onSaved(result);
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ul className={rowClass}>
        {draft.map((entry, i) => (
          <li key={WEEKDAYS[i]} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2">
            <span className="w-24 text-sm text-[var(--tfmc-cream)]">{WEEKDAYS[i]}</span>
            <AvailabilityButtons
              label={`${WEEKDAYS[i]} default`}
              value={entry.status}
              nullLabel="Not set"
              nullTitle="No default for this weekday"
              disabled={busy}
              onChange={(status) => update(i, { status })}
            />
            <input
              className={`${inputClass} min-w-0 flex-1 basis-40 py-1`}
              value={entry.status ? entry.note : ""}
              maxLength={200}
              disabled={busy || !entry.status}
              placeholder={entry.status ? "Note, e.g. evenings only" : ""}
              aria-label={`${WEEKDAYS[i]} note`}
              onChange={(e) => update(i, { note: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} disabled={busy || !dirty} onClick={save}>
          Save weekly defaults
        </button>
        {saved && !dirty ? <span className="text-xs text-[var(--tfmc-mist)]">Saved.</span> : null}
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
