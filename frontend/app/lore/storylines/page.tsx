"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { entityHref, listEntities, loreErrorMessage, STORYLINE_STATUSES, type StorylineRow } from "@/lib/lore/api";
import { formatDay } from "@/lib/lore/dates";
import AdminColumn from "../../components/admin/AdminColumn";
import { errorClass, headingClass, inputClass, mutedClass, panelClass, rowClass } from "../../components/admin/ui";
import QuickCreate from "../../components/lore/QuickCreate";
import StatusBadge, { statusLabel } from "../../components/lore/StatusBadge";

type Loaded = { key: string; rows: StorylineRow[]; error: string };

export default function StorylinesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const search = q.trim();
  const key = `${status}|${search}`;

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(
      () => {
        listEntities("storyline", { q: search || undefined, status: status || undefined })
          .then((rows) => live && setLoaded({ key, rows, error: "" }))
          .catch((err) => live && setLoaded({ key, rows: [], error: loreErrorMessage(err) }));
      },
      search ? 250 : 0,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [key, search, status]);

  const loading = loaded?.key !== key;
  const rows = loaded?.rows ?? [];
  const filtered = Boolean(search || status);

  return (
    <AdminColumn>
      <section className={panelClass}>
        <QuickCreate kind="storyline" placeholder="New storyline title…" />
      </section>
      <section className={panelClass}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={headingClass}>Storylines</h2>
          <span className={mutedClass}>{loaded ? `${loaded.rows.length} shown` : ""}</span>
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="search"
            className={`${inputClass} min-w-0 flex-1`}
            value={q}
            maxLength={120}
            placeholder="Search by title…"
            aria-label="Search storylines"
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={inputClass}
            value={status}
            aria-label="Filter by status"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any status</option>
            {STORYLINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        {loaded?.error ? (
          <p className={errorClass} role="alert">
            {loaded.error}
          </p>
        ) : !loaded ? (
          <p className={mutedClass}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className={mutedClass}>{filtered ? "Nothing matches." : "No storylines yet. Add the first above."}</p>
        ) : (
          <ul className={`${rowClass} ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={entityHref("storyline", row.id)}
                  className="flex flex-col gap-0.5 py-2.5 hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_5%,transparent)]"
                >
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="break-words text-[var(--tfmc-cream)]">{row.title || "Untitled"}</span>
                    <StatusBadge status={row.status} />
                    <span className="ml-auto flex flex-wrap gap-x-3 text-xs text-[var(--tfmc-stone)]">
                      {row.next_event_on ? <span>Next: {formatDay(row.next_event_on)}</span> : null}
                      <span>
                        {row.event_count} {row.event_count === 1 ? "event" : "events"}
                      </span>
                    </span>
                  </span>
                  {row.summary ? (
                    <span className="line-clamp-1 text-xs text-[var(--tfmc-stone)]">{row.summary}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminColumn>
  );
}
