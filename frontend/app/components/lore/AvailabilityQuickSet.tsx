"use client";

import { useState } from "react";

import { loreErrorMessage, setMyDays, type Availability, type DayStatus, type MyAvailability } from "@/lib/lore/api";
import { formatDay } from "@/lib/lore/dates";
import { errorClass, quietButtonClass, rowClass } from "../admin/ui";
import AvailabilityButtons from "./AvailabilityButtons";

type Day = DayStatus & { day: string };

const SOURCE_HINT: Record<string, string> = {
  override: "Set for this day",
  weekly: "Weekly default",
};

/**
 * One row per day with Full / Partial / None and Clear: each click saves that
 * day's own entry; Clear drops it so the weekly default applies again.
 */
export default function AvailabilityQuickSet({
  days,
  today,
  onSaved,
}: {
  days: Day[];
  today?: string;
  onSaved: (saved: MyAvailability) => void;
}) {
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function save(entry: Day, status: Availability | null) {
    setBusyDay(entry.day);
    setError("");
    try {
      // Keep a note the day already had when only the status changes.
      const note = status && entry.source === "override" ? entry.note : "";
      onSaved(await setMyDays([{ day: entry.day, status, note }]));
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusyDay(null);
    }
  }

  return (
    <div>
      <ul className={rowClass}>
        {days.map((entry) => (
          <li key={entry.day} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2">
            <span className="w-28 text-sm text-[var(--tfmc-cream)]">
              {formatDay(entry.day)}
              {entry.day === today ? <span className="ml-1.5 text-xs text-[var(--tfmc-accent)]">today</span> : null}
            </span>
            <AvailabilityButtons
              label={`My availability on ${formatDay(entry.day)}`}
              value={entry.status}
              disabled={busyDay !== null}
              onChange={(status) => save(entry, status)}
            />
            <button
              type="button"
              className={quietButtonClass}
              disabled={busyDay !== null || entry.source !== "override"}
              title="Remove this day’s entry and use your weekly default"
              onClick={() => save(entry, null)}
            >
              Clear
            </button>
            <span className="text-xs text-[var(--tfmc-stone)]">
              {entry.source ? SOURCE_HINT[entry.source] : "Not set"}
              {entry.note ? ` · ${entry.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
