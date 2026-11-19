"use client";

import { AVAILABILITY, type Availability } from "@/lib/lore/api";
import { AVAILABILITY_LABEL } from "@/lib/lore/availability";
import { AVAILABILITY_TONE } from "./AvailabilityPill";

const BASE =
  "rounded-sm border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)]";
const IDLE = "text-[var(--tfmc-mist)] hover:border-[var(--tfmc-accent)] hover:text-[var(--tfmc-cream)]";

/**
 * Full / Partial / None buttons, plus an optional last button for "no answer"
 * (`nullLabel`, e.g. "Not set" or "Clear"). The chosen one is filled in.
 */
export default function AvailabilityButtons({
  value,
  onChange,
  nullLabel,
  nullTitle,
  disabled = false,
  label,
}: {
  value: Availability | null | undefined;
  onChange: (status: Availability | null) => void;
  nullLabel?: string;
  nullTitle?: string;
  disabled?: boolean;
  /** Accessible name of the group, e.g. the day. */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {AVAILABILITY.map((status) => {
        const on = value === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            className={`${BASE} ${on ? `${AVAILABILITY_TONE[status]} border-transparent` : IDLE}`}
            onClick={() => onChange(status)}
          >
            {AVAILABILITY_LABEL[status]}
          </button>
        );
      })}
      {nullLabel ? (
        <button
          type="button"
          aria-pressed={value === null}
          disabled={disabled}
          title={nullTitle}
          className={`${BASE} ${value === null ? `${AVAILABILITY_TONE.unset} border-transparent` : IDLE}`}
          onClick={() => onChange(null)}
        >
          {nullLabel}
        </button>
      ) : null}
    </div>
  );
}
