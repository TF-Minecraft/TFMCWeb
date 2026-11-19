"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminColumn from "../../components/admin/AdminColumn";
import { errorClass, headingClass, mutedClass, pagerClass, panelClass, rowClass } from "../../components/admin/ui";
import { entityHref, getDeleted, KIND_LABEL, loreErrorMessage, restoreEntity, type DeletedItem } from "@/lib/lore/api";
import { formatInstant } from "@/lib/lore/dates";

const linkClass = "text-[var(--tfmc-accent)] underline-offset-2 hover:underline";

function DeletedRow({ item }: { item: DeletedItem }) {
  const [state, setState] = useState<"idle" | "busy" | "restored">("idle");
  const [error, setError] = useState("");

  async function restore() {
    setState("busy");
    setError("");
    try {
      await restoreEntity(item.kind, item.id);
      setState("restored");
    } catch (err) {
      setError(loreErrorMessage(err));
      setState("idle");
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
        {KIND_LABEL[item.kind] ?? item.kind}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block break-words ${state === "restored" ? "text-[var(--tfmc-cream)]" : "text-[var(--tfmc-mist)] line-through"}`}
        >
          {item.label || "Untitled"}
        </span>
        <span className="block text-xs text-[var(--tfmc-stone)]">Deleted {formatInstant(item.deleted_at)}</span>
      </span>
      {state === "restored" ? (
        <span className="flex items-center gap-3 text-sm">
          <span className="text-[var(--tfmc-mist)]">Restored.</span>
          <Link href={entityHref(item.kind, item.id)} className={linkClass}>
            Open it
          </Link>
        </span>
      ) : (
        <button type="button" className={pagerClass} disabled={state === "busy"} onClick={() => void restore()}>
          {state === "busy" ? "Restoring…" : "Restore"}
        </button>
      )}
      {error ? (
        <p className={`${errorClass} basis-full`} role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export default function LoreDeletedPage() {
  const [items, setItems] = useState<DeletedItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getDeleted()
      .then((next) => live && setItems(next))
      .catch((err) => live && setError(loreErrorMessage(err)));
    return () => {
      live = false;
    };
  }, []);

  return (
    <AdminColumn>
      <section className={panelClass}>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={headingClass}>Deleted</h2>
          <span className={mutedClass}>{items ? `${items.length} deleted` : ""}</span>
        </div>
        <p className={mutedClass}>Deleted records keep their history and links. Restore one to bring it back.</p>
        {error ? (
          <p className={`${errorClass} mt-4`} role="alert">
            {error}
          </p>
        ) : !items ? (
          <p className={`${mutedClass} mt-4`}>Loading…</p>
        ) : items.length === 0 ? (
          <p className={`${mutedClass} mt-4`}>Nothing has been deleted.</p>
        ) : (
          <ul className={`${rowClass} mt-2`}>
            {items.map((item) => (
              <DeletedRow key={`${item.kind}:${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </section>
    </AdminColumn>
  );
}
