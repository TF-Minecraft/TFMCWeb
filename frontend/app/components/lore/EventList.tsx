"use client";

import Link from "next/link";

import { entityHref, type EventBrief } from "@/lib/lore/api";
import { eventWhen } from "@/lib/lore/eventPlan";
import { pagerClass, rowClass } from "../admin/ui";
import StatusBadge from "./StatusBadge";

/**
 * A storyline's events in story order, each with its status and when it happens (or
 * what it waits on). With `onMove`, each row gets up and down buttons.
 */
export default function EventList({
  events,
  timeZone,
  disabled = false,
  onMove,
}: {
  events: EventBrief[];
  timeZone: string;
  disabled?: boolean;
  onMove?: (index: number, delta: -1 | 1) => void;
}) {
  return (
    <ol className={rowClass}>
      {events.map((event, index) => (
        <li key={event.id} className="flex items-center gap-3 py-2">
          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-[var(--tfmc-stone)]">{index + 1}.</span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <Link
                href={entityHref("event", event.id)}
                className="break-words text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
              >
                {event.label || "Untitled"}
              </Link>
              <StatusBadge status={event.status} />
            </span>
            <span className="break-words text-xs text-[var(--tfmc-stone)]">{eventWhen(event, timeZone)}</span>
          </div>
          {onMove ? (
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                className={pagerClass}
                disabled={disabled || index === 0}
                aria-label={`Move ${event.label} earlier`}
                onClick={() => onMove(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className={pagerClass}
                disabled={disabled || index === events.length - 1}
                aria-label={`Move ${event.label} later`}
                onClick={() => onMove(index, 1)}
              >
                ↓
              </button>
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
