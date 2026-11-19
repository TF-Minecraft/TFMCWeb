import { badgeClass } from "../admin/ui";

const GREEN = "bg-[#2f5d3a] text-[#cdeccf]";
const BLUE = "bg-[#2c4a63] text-[#cfe3f5]";
const AMBER = "bg-[#6b5326] text-[#f5e2b8]";
const GREY = "bg-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)] text-[var(--tfmc-mist)]";
const RED = "bg-[#5e2f2f] text-[#f2cccc]";

const TONE: Record<string, string> = {
  // characters
  active: GREEN,
  inactive: GREY,
  missing: AMBER,
  dead: RED,
  // storylines
  planning: BLUE,
  concluded: GREY,
  abandoned: RED,
  // events
  idea: BLUE,
  waiting: AMBER,
  scheduled: GREEN,
  done: GREY,
  cancelled: RED,
};

export function statusLabel(status: string): string {
  return status ? status[0].toUpperCase() + status.slice(1) : "";
}

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return null;
  return <span className={`${badgeClass} ${TONE[status] ?? GREY} ${className}`}>{statusLabel(status)}</span>;
}
