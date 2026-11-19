import type { Availability } from "@/lib/lore/api";
import { availabilityLabel } from "@/lib/lore/availability";
import { badgeClass } from "../admin/ui";

export const AVAILABILITY_TONE: Record<Availability | "unset", string> = {
  full: "bg-[#2f5d3a] text-[#cdeccf]",
  partial: "bg-[#6b5326] text-[#f5e2b8]",
  none: "bg-[#5e2f2f] text-[#f2cccc]",
  unset: "bg-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] text-[var(--tfmc-stone)]",
};

/** Full / Partial / None / Not set, with the person's note on hover and, if asked, beside it. */
export default function AvailabilityPill({
  status,
  note,
  showNote = false,
}: {
  status: Availability | null | undefined;
  note?: string;
  showNote?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" title={note || undefined}>
      <span className={`${badgeClass} ${AVAILABILITY_TONE[status ?? "unset"]}`}>{availabilityLabel(status)}</span>
      {showNote && note ? <span className="text-xs text-[var(--tfmc-mist)]">{note}</span> : null}
    </span>
  );
}
