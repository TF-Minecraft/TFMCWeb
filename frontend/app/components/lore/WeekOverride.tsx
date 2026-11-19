"use client";

import { useState } from "react";

import { loreErrorMessage, setMyDays, type Availability, type MyAvailability } from "@/lib/lore/api";
import { weekLabel, weekOverride } from "@/lib/lore/calendar";
import { buttonClass, errorClass, inputClass } from "../admin/ui";
import AvailabilityButtons from "./AvailabilityButtons";
import { Field } from "./DetailParts";

/**
 * Sets one status on all seven days of a chosen week, or clears that week's
 * day entries so the weekly defaults apply again.
 */
export default function WeekOverride({
  weeks,
  initialWeek,
  onSaved,
}: {
  /** Mondays to choose from. */
  weeks: string[];
  initialWeek: string;
  onSaved: (saved: MyAvailability) => void;
}) {
  const [week, setWeek] = useState(weeks.includes(initialWeek) ? initialWeek : weeks[0]);
  const [status, setStatus] = useState<Availability | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function apply() {
    if (status === undefined || !week) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      onSaved(await setMyDays(weekOverride(week, status, note)));
      setDone(status ? `Set ${weekLabel(week)}.` : `Cleared ${weekLabel(week)}.`);
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Week">
        <select
          className={inputClass}
          value={week}
          disabled={busy}
          onChange={(e) => {
            setWeek(e.target.value);
            setDone("");
          }}
        >
          {weeks.map((monday) => (
            <option key={monday} value={monday}>
              {weekLabel(monday)}
            </option>
          ))}
        </select>
      </Field>
      <AvailabilityButtons
        label="Status for the whole week"
        value={status}
        nullLabel="Clear"
        nullTitle="Remove this week's day entries so the weekly defaults apply"
        disabled={busy}
        onChange={(next) => {
          setStatus(next);
          setDone("");
        }}
      />
      <Field label="Note">
        <input
          className={inputClass}
          value={status ? note : ""}
          maxLength={200}
          disabled={busy || !status}
          placeholder={status ? "e.g. away, phone only" : ""}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} disabled={busy || status === undefined} onClick={apply}>
          {status === null ? "Clear the week" : "Apply to the week"}
        </button>
        {done ? <span className="text-xs text-[var(--tfmc-mist)]">{done}</span> : null}
      </div>
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
