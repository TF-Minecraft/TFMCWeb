"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CHARACTER_STATUSES, entityHref, listEntities, loreErrorMessage, type CharacterRow } from "@/lib/lore/api";
import AdminColumn from "../../components/admin/AdminColumn";
import { errorClass, headingClass, inputClass, mutedClass, panelClass, rowClass } from "../../components/admin/ui";
import CharacterFace from "../../components/lore/CharacterFace";
import QuickCreate from "../../components/lore/QuickCreate";
import StatusBadge, { statusLabel } from "../../components/lore/StatusBadge";

type Loaded = { key: string; rows: CharacterRow[]; error: string };

export default function CharactersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${status}|${q.trim()}`;

  useEffect(() => {
    let live = true;
    const query = q.trim();
    const timer = window.setTimeout(
      () => {
        listEntities("character", { q: query || undefined, status: status === "all" ? undefined : status })
          .then((rows) => live && setLoaded({ key, rows, error: "" }))
          .catch((err) => live && setLoaded({ key, rows: [], error: loreErrorMessage(err) }));
      },
      query ? 200 : 0,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [key, q, status]);

  const loading = loaded?.key !== key;
  const rows = loaded?.rows ?? [];

  return (
    <AdminColumn>
      <section className={panelClass}>
        <QuickCreate kind="character" placeholder="New character name…" />
      </section>
      <section className={panelClass}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={headingClass}>Characters</h2>
          <span className={mutedClass}>{loaded ? `${loaded.rows.length} shown` : ""}</span>
        </div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            className={`${inputClass} min-w-0 flex-1`}
            value={q}
            maxLength={120}
            placeholder="Search by name…"
            aria-label="Search characters"
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={`${inputClass} sm:w-44`}
            value={status}
            aria-label="Status"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {CHARACTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        {!loaded || (loading && (loaded.error || rows.length === 0)) ? (
          <p className={mutedClass}>Loading…</p>
        ) : loaded.error ? (
          <p className={errorClass} role="alert">
            {loaded.error}
          </p>
        ) : rows.length === 0 ? (
          <p className={mutedClass}>
            {q.trim() || status !== "all" ? "No characters match." : "No characters yet. Add the first above."}
          </p>
        ) : (
          <ul className={`${rowClass} ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={entityHref("character", row.id)}
                  className="flex items-center gap-3 py-2.5 hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_5%,transparent)]"
                >
                  <CharacterFace id={row.id} name={row.name} hasFace={row.has_face} cacheKey={row.updated_at} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-[var(--tfmc-cream)]">{row.name || "Unnamed"}</span>
                      <StatusBadge status={row.status} />
                      {row.player_name ? (
                        <span className="text-xs text-[var(--tfmc-stone)]">{row.player_name}</span>
                      ) : null}
                    </span>
                    {row.organisations.length > 0 ? (
                      <span className="truncate text-xs text-[var(--tfmc-mist)]">{row.organisations.join(", ")}</span>
                    ) : null}
                    {row.summary ? (
                      <span className="line-clamp-1 text-xs text-[var(--tfmc-stone)]">{row.summary}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminColumn>
  );
}
