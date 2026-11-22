"use client";

import type { DayStatus, RosterPerson } from "@/lib/lore/api";
import { rankForDay } from "@/lib/lore/availability";
import { quietButtonClass, rowClass } from "../admin/ui";
import AvailabilityPill from "./AvailabilityPill";

export type DayPerson = RosterPerson & DayStatus;

/**
 * The roster for one day, Full first, each with their availability and note. With
 * `showStatus` off (no date picked yet) it is just the roster by name. `helperIds`
 * marks who is already helping; `onToggle` adds or removes them.
 */
export default function DayAvailability({
  people,
  showStatus,
  helperIds,
  disabled = false,
  onToggle,
}: {
  people: DayPerson[];
  showStatus: boolean;
  helperIds: number[];
  disabled?: boolean;
  onToggle?: (userId: number, helping: boolean) => void;
}) {
  const ranked = showStatus ? rankForDay(people) : [...people].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <ul className={rowClass}>
      {ranked.map((person) => {
        const helping = helperIds.includes(person.user_id);
        return (
          <li key={person.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
            <span className="min-w-0 break-words text-sm text-[var(--tfmc-cream)]">{person.name}</span>
            {showStatus ? <AvailabilityPill status={person.status} note={person.note} showNote /> : null}
            {onToggle ? (
              <button
                type="button"
                className={`${quietButtonClass} ml-auto`}
                disabled={disabled}
                onClick={() => onToggle(person.user_id, !helping)}
              >
                {helping ? "Remove helper" : "Add as helper"}
              </button>
            ) : helping ? (
              <span className="ml-auto text-xs text-[var(--tfmc-stone)]">Helping</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
