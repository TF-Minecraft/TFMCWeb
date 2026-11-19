"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { entityHref, listEntities, loreErrorMessage, type OrganisationRow } from "@/lib/lore/api";
import AdminColumn from "../../components/admin/AdminColumn";
import { errorClass, headingClass, inputClass, mutedClass, panelClass, rowClass } from "../../components/admin/ui";
import QuickCreate from "../../components/lore/QuickCreate";

type Loaded = { key: string; rows: OrganisationRow[]; error: string };

export default function OrganisationsPage() {
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = q.trim();

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(
      () => {
        listEntities("organisation", { q: key || undefined })
          .then((rows) => live && setLoaded({ key, rows, error: "" }))
          .catch((err) => live && setLoaded({ key, rows: [], error: loreErrorMessage(err) }));
      },
      key ? 200 : 0,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [key]);

  const loading = loaded?.key !== key;
  const rows = loaded?.rows ?? [];

  return (
    <AdminColumn>
      <section className={panelClass}>
        <QuickCreate kind="organisation" placeholder="New faction or organisation name…" />
      </section>
      <section className={panelClass}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={headingClass}>Factions &amp; organisations</h2>
          <span className={mutedClass}>{loaded ? `${loaded.rows.length} shown` : ""}</span>
        </div>
        <input
          type="search"
          className={`${inputClass} mb-4 w-full`}
          value={q}
          maxLength={120}
          placeholder="Search by name…"
          aria-label="Search factions and organisations"
          onChange={(e) => setQ(e.target.value)}
        />
        {loaded?.error ? (
          <p className={errorClass} role="alert">
            {loaded.error}
          </p>
        ) : !loaded ? (
          <p className={mutedClass}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className={mutedClass}>
            {key ? "Nothing matches." : "No factions or organisations yet. Add the first above."}
          </p>
        ) : (
          <ul className={`${rowClass} ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={entityHref("organisation", row.id)}
                  className="flex flex-col gap-0.5 py-2.5 hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_5%,transparent)]"
                >
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="break-words text-[var(--tfmc-cream)]">{row.name || "Unnamed"}</span>
                    {row.kind ? (
                      <span className="text-xs uppercase tracking-wider text-[var(--tfmc-stone)]">{row.kind}</span>
                    ) : null}
                    {row.game_faction ? (
                      <span className="text-xs text-[var(--tfmc-mist)]">In game: {row.game_faction}</span>
                    ) : null}
                    <span className="ml-auto text-xs text-[var(--tfmc-stone)]">
                      {row.member_count} {row.member_count === 1 ? "member" : "members"}
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
