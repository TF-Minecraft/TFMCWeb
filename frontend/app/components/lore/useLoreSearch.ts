"use client";

import { useEffect, useState } from "react";

import { searchLore, type EntityKind, type SearchResult } from "@/lib/lore/api";

type Found = { key: string; results: SearchResult[] };

/**
 * Debounced /lore/search results for `query`. Results are tied to the query and kinds they
 * answer, so stale ones never show for newer input: until the current search completes,
 * `results` is empty and `settled` is false. Disabled, it returns nothing. With `players`,
 * it also finds players' RPCharacters characters not yet in the lore records.
 */
export function useLoreSearch(query: string, kinds: EntityKind[], enabled = true, players = false) {
  const [found, setFound] = useState<Found | null>(null);
  const kindKey = kinds.join(",");
  const q = query.trim();
  const key = `${kindKey}\u0000${players ? "p" : ""}\u0000${q}`;

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const timer = window.setTimeout(() => {
      searchLore(q, kindKey ? (kindKey.split(",") as EntityKind[]) : [], 12, players)
        .then((results) => live && setFound({ key, results }))
        .catch(() => live && setFound({ key, results: [] }));
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [q, kindKey, key, enabled, players]);

  const settled = enabled && found?.key === key;
  return { results: settled ? found.results : [], loading: enabled && !settled, settled };
}
