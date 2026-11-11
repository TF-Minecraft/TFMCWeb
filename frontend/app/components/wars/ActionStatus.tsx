import type { ActionStatusView } from "@/lib/wars/actions";
import { formatDateTime } from "@/lib/wars/format";

export const STATUS_TONE: Record<ActionStatusView["tone"], string> = {
  pending: "text-[var(--tfmc-stone)]",
  done: "text-[var(--tfmc-accent)]",
  refused: "text-[#e0a48f]",
};

export function StatusLine({ status }: { status: ActionStatusView | null }) {
  if (!status) return null;
  return (
    <p role="status" className={`text-sm font-medium ${STATUS_TONE[status.tone]}`}>
      {status.tone === "pending" ? (
        <span
          aria-hidden
          className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--tfmc-stone)] align-middle"
        />
      ) : null}
      {status.text}
    </p>
  );
}

export function closesText(closesAt: string | null | undefined): string {
  const when = formatDateTime(closesAt);
  return when ? `The vote closes ${when}.` : "";
}
