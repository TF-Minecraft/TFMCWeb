"use client";

import { buttonClass, errorClass, quietButtonClass, warnClass } from "../admin/ui";

/**
 * Sticks to the bottom of the page while there are unsaved changes, and explains a
 * version conflict (someone else saved first) with Keep mine / Take theirs.
 */
export default function SaveBar({
  dirty,
  saving,
  error,
  conflict,
  onSave,
  onDiscard,
  onKeepMine,
  onTakeTheirs,
}: {
  dirty: boolean;
  saving: boolean;
  error?: string;
  conflict?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onKeepMine?: () => void;
  onTakeTheirs?: () => void;
}) {
  if (!dirty && !conflict && !error) return null;
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-0 z-30 mt-6 border-t border-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)] bg-[var(--tfmc-forest-deep)] py-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        {conflict ? (
          <>
            <p className={`${warnClass} flex-1`} role="alert">
              Someone else saved this while you were editing. The page now shows their version under your changes.
            </p>
            <button type="button" className={buttonClass} disabled={saving} onClick={onKeepMine}>
              {saving ? "Saving…" : "Keep mine"}
            </button>
            <button type="button" className={quietButtonClass} disabled={saving} onClick={onTakeTheirs}>
              Take theirs
            </button>
          </>
        ) : (
          <>
            <p
              className={`flex-1 ${error ? errorClass : "text-sm text-[var(--tfmc-mist)]"}`}
              role={error ? "alert" : undefined}
            >
              {error || "You have unsaved changes."}
            </p>
            {dirty ? (
              <>
                <button type="button" className={quietButtonClass} disabled={saving} onClick={onDiscard}>
                  Discard
                </button>
                <button type="button" className={buttonClass} disabled={saving} onClick={onSave}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
