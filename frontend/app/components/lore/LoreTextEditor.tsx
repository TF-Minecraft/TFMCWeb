"use client";

import { useRef, useState } from "react";

import { ENTITY_KINDS, KIND_LABEL, type SearchResult } from "@/lib/lore/api";
import { insertMention, mentionToken, openMention } from "@/lib/lore/mentions";
import { inputClass, quietButtonClass } from "../admin/ui";
import LoreText from "./LoreText";
import { useLoreSearch } from "./useLoreSearch";

/**
 * A textarea for lore text. Typing [[ (or pressing “Link”) opens a search; picking a
 * record inserts a [[kind:id|Label]] link, which the server turns into a backlink.
 */
export default function LoreTextEditor({
  label,
  value,
  onChange,
  rows = 4,
  maxLength,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState(false);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const open = focusMention(value, caret, dismissed);
  const { results, loading } = useLoreSearch(open?.query ?? "", ENTITY_KINDS, open !== null);

  function track() {
    const el = ref.current;
    if (el) setCaret(el.selectionStart ?? 0);
  }

  function place(at: number) {
    window.requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(at, at);
      setCaret(at);
    });
  }

  function pick(result: SearchResult) {
    if (!open) return;
    const next = insertMention(value, open.start, caret, mentionToken(result.kind, result.id, result.label));
    onChange(next.text);
    setActive(0);
    place(next.caret);
  }

  function startLink() {
    const el = ref.current;
    const at = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? at;
    onChange(`${value.slice(0, at)}[[${value.slice(end)}`);
    setDismissed(null);
    place(at + 2);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || results.length === 0) {
      if (open && e.key === "Escape") setDismissed(open.start);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(results[Math.min(active, results.length - 1)]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(open.start);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">{label}</span>
        <span className="flex gap-3">
          <button type="button" className={quietButtonClass} disabled={disabled || preview} onClick={startLink}>
            Link…
          </button>
          <button type="button" className={quietButtonClass} onClick={() => setPreview((p) => !p)}>
            {preview ? "Edit" : "Preview"}
          </button>
        </span>
      </div>
      {preview ? (
        <div className="min-h-[5rem] rounded-sm border border-dashed border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] px-3 py-2">
          <LoreText text={value} />
        </div>
      ) : (
        <div className="relative">
          <textarea
            ref={ref}
            aria-label={label}
            className={`${inputClass} w-full resize-y`}
            rows={rows}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              setCaret(e.target.selectionStart ?? 0);
              setActive(0);
            }}
            onSelect={track}
            onKeyUp={track}
            onClick={track}
            onKeyDown={onKeyDown}
            onBlur={() => window.setTimeout(() => setDismissed(open?.start ?? null), 150)}
            onFocus={() => setDismissed(null)}
          />
          {open && (results.length > 0 || loading) ? (
            <ul
              role="listbox"
              aria-label="Link to"
              className="absolute left-0 right-0 z-40 max-h-60 overflow-y-auto rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] bg-[var(--tfmc-forest-deep)] py-1 shadow-lg"
            >
              {results.map((result, i) => (
                <li
                  key={`${result.kind}:${result.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                    i === active ? "bg-[color-mix(in_srgb,var(--tfmc-accent)_22%,transparent)]" : ""
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(result);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate text-[var(--tfmc-cream)]">{result.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--tfmc-stone)]">
                    {KIND_LABEL[result.kind]}
                  </span>
                </li>
              ))}
              {loading && results.length === 0 ? (
                <li className="px-3 py-1.5 text-sm text-[var(--tfmc-stone)]">Searching…</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}
      <span className="text-xs text-[var(--tfmc-stone)]">
        Type <code>[[</code> to link a character, faction, storyline, event or location.
      </span>
    </div>
  );
}

function focusMention(value: string, caret: number, dismissed: number | null) {
  const open = openMention(value, caret);
  return open && open.start !== dismissed ? open : null;
}
