"use client";

import { useId, useMemo, useRef, useState } from "react";

import { KIND_LABEL, loreErrorMessage, type EntityKind, type SearchResult } from "@/lib/lore/api";
import { errorClass, inputClass } from "../admin/ui";
import StatusBadge from "./StatusBadge";
import { useLoreSearch } from "./useLoreSearch";

type Option = { type: "result"; result: SearchResult } | { type: "create"; label: string };

/**
 * A search box over lore records. Picking a result calls `onPick`; when `onCreate`
 * is given and nothing matches exactly, a “Create …” option makes a new record.
 */
export default function EntityPicker({
  kinds,
  onPick,
  onCreate,
  exclude = [],
  placeholder,
  autoFocus = false,
  className = "",
}: {
  kinds: EntityKind[];
  onPick: (result: SearchResult) => void | Promise<void>;
  onCreate?: (label: string) => Promise<SearchResult | void>;
  /** Keys ("kind:id") already chosen, hidden from the list. */
  exclude?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { results, loading } = useLoreSearch(query, kinds, open);

  const options = useMemo<Option[]>(() => {
    const shown: Option[] = results
      .filter((r) => !exclude.includes(`${r.kind}:${r.id}`))
      .map((result) => ({ type: "result", result }));
    const label = query.trim();
    const exact = results.some((r) => r.label.trim().toLowerCase() === label.toLowerCase());
    if (onCreate && label && !exact) shown.push({ type: "create", label });
    return shown;
  }, [results, exclude, query, onCreate]);

  async function choose(option: Option) {
    setError("");
    setBusy(true);
    try {
      if (option.type === "result") await onPick(option.result);
      else if (onCreate) {
        const made = await onCreate(option.label);
        if (made) await onPick(made);
      }
      setQuery("");
      setOpen(false);
      setActive(0);
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && options[active]) {
        e.preventDefault();
        void choose(options[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const kindText = kinds.length === 1 ? KIND_LABEL[kinds[0]].toLowerCase() : "record";
  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        disabled={busy}
        value={query}
        placeholder={placeholder ?? `Find a ${kindText}…`}
        className={`${inputClass} w-full`}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && (options.length > 0 || loading) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] bg-[var(--tfmc-forest-deep)] py-1 shadow-lg"
        >
          {options.map((option, i) => (
            <li
              key={option.type === "result" ? `${option.result.kind}:${option.result.id}` : "create"}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                i === active ? "bg-[color-mix(in_srgb,var(--tfmc-accent)_22%,transparent)]" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(option);
              }}
            >
              {option.type === "result" ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-[var(--tfmc-cream)]">{option.result.label}</span>
                  {option.result.sublabel ? (
                    <span className="truncate text-xs text-[var(--tfmc-stone)]">{option.result.sublabel}</span>
                  ) : null}
                  <StatusBadge status={option.result.status} />
                  {kinds.length !== 1 ? (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--tfmc-stone)]">
                      {KIND_LABEL[option.result.kind]}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-[var(--tfmc-accent)]">
                  Create {kindText} “{option.label}”
                </span>
              )}
            </li>
          ))}
          {loading && options.length === 0 ? (
            <li className="px-3 py-1.5 text-sm text-[var(--tfmc-stone)]">Searching…</li>
          ) : null}
        </ul>
      ) : null}
      {error ? <p className={`${errorClass} mt-1`}>{error}</p> : null}
    </div>
  );
}
