"use client";

import { useId } from "react";

type Props = {
  label: string;
  /** Size / format hint under the label (e.g. "16×16 PNG"). */
  hint: string;
  accept: string;
  file: File | null | undefined;
  onPick: (file: File) => void;
  disabled?: boolean;
  /** When set, the card offers an optional `.mcmeta` animation for this texture. */
  animation?: {
    file: File | null | undefined;
    onPick: (file: File) => void;
    onClear: () => void;
  };
};

/** Ignore cancel / empty picker so an existing selection is kept. */
function picked(list: FileList | null, apply: (file: File) => void) {
  const file = list?.[0];
  if (file) apply(file);
}

const pickButton =
  "inline-flex cursor-pointer items-center rounded-sm bg-[var(--tfmc-moss)] px-3 py-1.5 text-xs font-medium text-[var(--tfmc-cream)] transition hover:opacity-90";

/** One upload card: required file, its hint, and an optional animation slot. */
export default function FileSlot({ label, hint, accept, file, onPick, disabled, animation }: Props) {
  const id = useId();
  const animId = useId();
  return (
    <div
      className={`flex flex-col gap-2 rounded-sm border p-3 ${
        file
          ? "border-[color-mix(in_srgb,var(--tfmc-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_6%,transparent)]"
          : "border-[color-mix(in_srgb,var(--tfmc-cream)_15%,transparent)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-[var(--tfmc-cream)]">{label}</span>
          <span className="block text-xs text-[var(--tfmc-mist)]">{hint}</span>
        </span>
        <span aria-hidden className={`text-xs ${file ? "text-[var(--tfmc-accent)]" : "text-[var(--tfmc-mist)]"}`}>
          {file ? "✓" : "Required"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={`${pickButton} ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          {file ? "Replace" : "Choose file"}
        </label>
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            picked(e.target.files, onPick);
            e.target.value = "";
          }}
          className="sr-only"
        />
        <span className="min-w-0 truncate text-xs text-[var(--tfmc-cream)]">{file?.name ?? ""}</span>
      </div>
      {animation ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] pt-2">
          <span className="text-xs text-[var(--tfmc-mist)]">Animation (.mcmeta)</span>
          <label
            htmlFor={animId}
            className={`cursor-pointer text-xs text-[var(--tfmc-accent)] hover:underline ${
              disabled ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {animation.file ? "Replace" : "Add"}
          </label>
          <input
            id={animId}
            type="file"
            accept=".mcmeta,application/json"
            disabled={disabled}
            aria-label={`${label} animation (.mcmeta)`}
            onChange={(e) => {
              picked(e.target.files, animation.onPick);
              e.target.value = "";
            }}
            className="sr-only"
          />
          {animation.file ? (
            <>
              <span className="min-w-0 truncate text-xs text-[var(--tfmc-cream)]">{animation.file.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={animation.onClear}
                className="text-xs text-[#e8a0a0] hover:underline"
              >
                Remove
              </button>
            </>
          ) : (
            <span className="text-[11px] text-[color-mix(in_srgb,var(--tfmc-mist)_75%,transparent)]">optional</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
