"use client";

import Link from "next/link";
import { useState } from "react";

import { entityHref, KIND_LABEL, loreErrorMessage, PLURAL, type EntityKind, type Ref } from "@/lib/lore/api";
import { formatInstant } from "@/lib/lore/dates";
import {
  buttonClass,
  errorClass,
  headingClass,
  mutedClass,
  panelClass,
  quietButtonClass,
  warnClass,
} from "../admin/ui";
import StatusBadge from "./StatusBadge";

/** A labelled form control. */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[var(--tfmc-stone)]">{hint}</span> : null}
    </label>
  );
}

/** A titled panel section. */
export function Section({
  title,
  actions,
  children,
  className = "",
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${panelClass} ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={`${headingClass} text-lg`}>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** A labelled read-only value, the view-mode twin of `Field`. */
export function ReadField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">{label}</span>
      {children}
    </div>
  );
}

/** A short plain value, or "Not set." when it is empty. */
export function ReadValue({ text }: { text: string | null | undefined }) {
  return text?.trim() ? (
    <p className="break-words text-sm text-[var(--tfmc-cream)]">{text}</p>
  ) : (
    <p className="text-sm italic text-[var(--tfmc-stone)]">Not set.</p>
  );
}

/** How a record page switches between reading and editing. */
export type EditControls = {
  editing: boolean;
  onEdit: () => void;
  /** Saves any changes, then goes back to reading. */
  onDone: () => void;
  saving?: boolean;
};

/**
 * The top of a record page: back link, title, status, who last edited it, and
 * delete (with a confirm). A deleted record shows a banner with Restore instead.
 * With `edit`, the page opens to read: Edit switches to the form, Done saves and
 * goes back, and Delete is only offered while editing.
 */
export function DetailHeader({
  kind,
  title,
  status,
  updatedAt,
  updatedBy,
  deletedAt,
  onDelete,
  onRestore,
  edit,
  children,
}: {
  kind: EntityKind;
  title: string;
  status?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  onDelete: () => Promise<void>;
  onRestore: () => Promise<void>;
  edit?: EditControls;
  children?: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const back =
    kind === "event"
      ? { href: "/lore/calendar", label: "Calendar" }
      : kind === "location"
        ? { href: "/lore/map", label: "Map" }
        : { href: `/lore/${PLURAL[kind]}`, label: KIND_LABEL[kind] + "s" };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setConfirming(false);
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <Link href={back.href} className={`${quietButtonClass} self-start`}>
        ← {back.label}
      </Link>
      {deletedAt ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-sm border border-[#6b5326] bg-[color-mix(in_srgb,#6b5326_25%,transparent)] px-3 py-2"
        >
          <p className={`${warnClass} flex-1`}>
            This {KIND_LABEL[kind].toLowerCase()} was deleted {formatInstant(deletedAt)}. Restore it to edit.
          </p>
          <button type="button" className={buttonClass} disabled={busy} onClick={() => run(onRestore)}>
            Restore
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
          {KIND_LABEL[kind]}
        </span>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 break-words font-[family-name:var(--font-fraunces)] text-2xl text-[var(--tfmc-cream)] sm:text-3xl">
          {title || "Untitled"}
        </h2>
        {deletedAt ? null : edit && !edit.editing ? (
          <button type="button" className={buttonClass} onClick={edit.onEdit}>
            Edit
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-3">
            {confirming ? (
              <>
                <span className="text-sm text-[var(--tfmc-mist)]">Delete this {KIND_LABEL[kind].toLowerCase()}?</span>
                <button
                  type="button"
                  className="rounded-sm bg-[#8a3b3b] px-3 py-1.5 text-sm font-semibold text-[var(--tfmc-cream)] disabled:opacity-50"
                  disabled={busy}
                  onClick={() => run(onDelete)}
                >
                  Delete
                </button>
                <button type="button" className={quietButtonClass} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className={quietButtonClass} onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
            {edit ? (
              <button type="button" className={buttonClass} disabled={edit.saving} onClick={edit.onDone}>
                {edit.saving ? "Saving…" : "Done"}
              </button>
            ) : null}
          </span>
        )}
      </div>
      {updatedAt ? (
        <p className="text-xs text-[var(--tfmc-stone)]">
          Last edited {formatInstant(updatedAt)}
          {updatedBy ? ` by ${updatedBy}` : ""}
        </p>
      ) : null}
      {error ? <p className={errorClass}>{error}</p> : null}
      {children}
    </div>
  );
}

/** A link to another record, struck through when it was deleted. */
export function RefLink({ item, showKind = false }: { item: Ref; showKind?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Link
        href={entityHref(item.kind, item.id)}
        className={`text-[var(--tfmc-accent)] underline-offset-2 hover:underline ${item.deleted ? "line-through opacity-60" : ""}`}
      >
        {item.label}
      </Link>
      {showKind ? (
        <span className="text-[10px] uppercase tracking-wider text-[var(--tfmc-stone)]">{KIND_LABEL[item.kind]}</span>
      ) : null}
      {item.status ? <StatusBadge status={item.status} /> : null}
    </span>
  );
}

/** "Mentioned in": records whose text links here. */
export function Backlinks({ items }: { items: Ref[] }) {
  return (
    <Section title="Mentioned in">
      {items.length === 0 ? (
        <p className={mutedClass}>Nothing links here yet. Type [[ in any text box to link to this.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={`${item.kind}:${item.id}`}>
              <RefLink item={item} showKind />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** An empty-state or loading line for a page. */
export function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={`mt-6 ${error ? errorClass : mutedClass}`} role={error ? "alert" : undefined}>
      {children}
    </p>
  );
}
