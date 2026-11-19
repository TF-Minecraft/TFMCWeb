"use client";

import { useEffect, useState } from "react";

import { searchLore, type EntityKind, type SearchResult } from "@/lib/lore/api";

/** Debounced /lore/search results for `query`; empty while the query is blank or `enabled` is false. */
export function useLoreSearch(query: string, kinds: EntityKind[], enabled = true) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const kindKey = kinds.join(",");

  useEffect(() => {
    const q = query.trim();
    if (!enabled) {
      setResults([]);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchLore(q, kindKey ? (kindKey.split(",") as EntityKind[]) : [], 12)
        .then((found) => live && setResults(found))
        .catch(() => live && setResults([]))
        .finally(() => live && setLoading(false));
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query, kindKey, enabled]);

  return { results, loading };
}
