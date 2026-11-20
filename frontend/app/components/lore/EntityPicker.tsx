"use client";

import { useId, useMemo, useRef, useState } from "react";

import { KIND_LABEL, adoptPlayerCharacter, loreErrorMessage, type EntityKind, type SearchResult } from "@/lib/lore/api";
import { errorClass, inputClass } from "../admin/ui";
import StatusBadge from "./StatusBadge";
import { useLoreSearch } from "./useLoreSearch";

type Option = { type: "result"; result: SearchResult } | { type: "create"; label: string };

/**
 * A search box over lore records. Picking a result calls `onPick`; when `onCreate`
 * is given and a finished search finds no exact match, a “Create …” option makes a new
 * record. If `onPick` then fails (throws, or returns false after showing its own error),
 * the new record is kept and the next try picks it instead of creating another.
 * `disabled` blocks picking while the caller is busy; `onBusyChange` tells the caller
 * while a pick or create runs, so it can hold other edits to the list `onPick` extends.
 * When `kinds` include characters, a search also offers players' RPCharacters characters
 * (unless `players` is false); picking one first adopts it as a lore character, so
 * `onPick` always gets a lore record.
 */
export default function EntityPicker({
  kinds,
  onPick,
  onCreate,
  exclude = [],
  placeholder,
  autoFocus = false,
  disabled = false,
  onBusyChange,
  players,
  className = "",
}: {
  kinds: EntityKind[];
  onPick: (result: SearchResult) => void | boolean | Promise<void | boolean>;
  onCreate?: (label: string) => Promise<SearchResult | void>;
  /** Keys ("kind:id") already chosen, hidden from the list. */
  exclude?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  /** Offer players' RPCharacters characters too; defaults to on when `kinds` include characters. */
  players?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  /** A record made by “Create …” whose onPick failed, reused on retry. */
  const made = useRef<SearchResult | null>(null);
  const listId = useId();
  const { results, loading, settled } = useLoreSearch(query, kinds, open, players ?? kinds.includes("character"));

  const options = useMemo<Option[]>(() => {
    const shown: Option[] = results
      .filter((r) => r.player || !exclude.includes(`${r.kind}:${r.id}`))
      .map((result) => ({ type: "result", result }));
    const label = query.trim();
    const exact = results.some((r) => r.label.trim().toLowerCase() === label.toLowerCase());
    if (onCreate && label && settled && !exact) shown.push({ type: "create", label });
    return shown;
  }, [results, exclude, query, onCreate, settled]);

  async function choose(option: Option) {
    if (disabled || busy) return;
    setError("");
    setBusy(true);
    onBusyChange?.(true);
    try {
      if (option.type === "result") {
        const { player } = option.result;
        const record = player ? await adoptPlayerCharacter(player) : option.result;
        // An adopted character may already be on the list, picked earlier under its lore record.
        if (!(player && exclude.includes(`${record.kind}:${record.id}`))) {
          if ((await onPick(record)) === false) return;
        }
      } else if (onCreate) {
        const kept = made.current;
        const record =
          kept && kept.label.trim().toLowerCase() === option.label.toLowerCase() ? kept : await onCreate(option.label);
        if (record) {
          made.current = record;
          if ((await onPick(record)) === false) return;
        }
        made.current = null;
      }
      setQuery("");
      setOpen(false);
      setActive(0);
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
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
        disabled={busy || disabled}
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
              key={option.type === "result" ? resultKey(option.result) : "create"}
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
                  {option.result.player ? (
                    <span
                      className="text-[10px] uppercase tracking-wider text-[var(--tfmc-accent)]"
                      title="A player's character from RPCharacters, added to the lore records when picked"
                    >
                      Player
                    </span>
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

function resultKey(result: SearchResult): string {
  return result.player ? `player:${result.player.uuid}:${result.player.character_id}` : `${result.kind}:${result.id}`;
}
