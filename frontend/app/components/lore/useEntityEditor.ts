"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  conflictCurrent,
  deleteEntity,
  getEntity,
  loreErrorMessage,
  restoreEntity,
  updateEntity,
  type DetailOf,
  type EntityKind,
} from "@/lib/lore/api";

export type EditorConflict<T> = { theirs: T };

/**
 * Loads one lore record and keeps a draft of the fields changed since. `save()` sends
 * only those fields with the version they were based on; if someone else saved first,
 * the server's copy lands in `conflict` and the draft is kept until the user picks.
 * Link changes (affiliations, members, …) don't bump the version: pass their result
 * to `replace()` and the draft stays valid. If a fresh copy carries a newer version
 * while there is a draft, someone else saved in between: that becomes a conflict too,
 * so the draft can't be saved over their changes unseen. A copy older than the one
 * shown (a slow response overtaken by a newer one) is dropped.
 */
export function useEntityEditor<K extends EntityKind>(kind: K, id: number) {
  type Detail = DetailOf[K];
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<EditorConflict<Detail> | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const dirty = Object.keys(draft).length > 0;
  /** Read by async callbacks, which must not act on what their closure saw. */
  const latest = useRef({ detail, dirty });
  useEffect(() => {
    latest.current = { detail, dirty };
  });
  /** The record this editor is for; responses for an earlier one are dropped. */
  const target = useRef(`${kind}:${id}`);
  /** Bumped by every read; only the newest read in flight may land. */
  const reads = useRef(0);

  /** Show a fresh copy; a newer version under a draft is a conflict, not a silent rebase. */
  const adopt = useCallback((next: Detail) => {
    const { detail: shown, dirty: editing } = latest.current;
    if (shown && next.version < shown.version) return;
    latest.current = { ...latest.current, detail: next };
    setDetail(next);
    if (editing && shown && next.version !== shown.version) setConflict({ theirs: next });
  }, []);

  const reload = useCallback(async () => {
    const key = `${kind}:${id}`;
    const read = ++reads.current;
    const current = () => target.current === key && read === reads.current;
    try {
      const next = await getEntity(kind, id);
      if (!current()) return null;
      adopt(next);
      setLoadError("");
      return next;
    } catch (err) {
      if (current()) setLoadError(loreErrorMessage(err));
      return null;
    }
  }, [kind, id, adopt]);

  useEffect(() => {
    const key = `${kind}:${id}`;
    target.current = key;
    const read = ++reads.current;
    const current = () => target.current === key && read === reads.current;
    latest.current = { detail: null, dirty: false };
    setDetail(null);
    setDraft({});
    setConflict(null);
    setError("");
    setLoadError("");
    getEntity(kind, id)
      .then((next) => {
        if (!current()) return;
        latest.current = { ...latest.current, detail: next };
        setDetail(next);
      })
      .catch((err) => current() && setLoadError(loreErrorMessage(err)));
  }, [kind, id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const value = useCallback(
    <F extends keyof Detail & string>(field: F): Detail[F] => {
      if (field in draft) return draft[field] as Detail[F];
      return (detail ? detail[field] : undefined) as Detail[F];
    },
    [draft, detail],
  );

  const set = useCallback(
    (field: keyof Detail & string, next: unknown) => {
      setError("");
      setDraft((prev) => {
        const copy = { ...prev };
        const saved = detail ? (detail as Record<string, unknown>)[field] : undefined;
        if (sameValue(saved, next)) delete copy[field];
        else copy[field] = next;
        return copy;
      });
    },
    [detail],
  );

  const sendDraft = useCallback(
    async (base: Detail, values: Record<string, unknown>) => {
      const key = `${kind}:${id}`;
      setSaving(true);
      setError("");
      try {
        const saved = await updateEntity(kind, id, base.version, values);
        if (target.current !== key) return false;
        // Reads started before the save would show the old version: drop them.
        reads.current++;
        latest.current = { ...latest.current, detail: saved };
        setDetail(saved);
        // Keep edits made while the save was in flight; drop only what was sent and saved.
        setDraft((prev) => {
          const left: Record<string, unknown> = {};
          for (const [field, v] of Object.entries(prev)) {
            if (field in values && sameValue(values[field], v)) continue;
            if (sameValue((saved as Record<string, unknown>)[field], v)) continue;
            left[field] = v;
          }
          return left;
        });
        setConflict(null);
        setHistoryKey((k) => k + 1);
        return true;
      } catch (err) {
        if (target.current !== key) return false;
        const theirs = conflictCurrent<Detail>(err);
        if (theirs) {
          reads.current++;
          latest.current = { ...latest.current, detail: theirs };
          setDetail(theirs);
          setConflict({ theirs });
        } else setError(loreErrorMessage(err));
        return false;
      } finally {
        if (target.current === key) setSaving(false);
      }
    },
    [kind, id],
  );

  const save = useCallback(async () => {
    if (!detail || !dirty) return true;
    return sendDraft(detail, draft);
  }, [detail, dirty, draft, sendDraft]);

  /** After a conflict: send my draft again on top of their version. */
  const keepMine = useCallback(async () => {
    if (!conflict) return false;
    return sendDraft(conflict.theirs, draft);
  }, [conflict, draft, sendDraft]);

  /** After a conflict: drop my draft and show their version. */
  const takeTheirs = useCallback(() => {
    setDraft({});
    setConflict(null);
    setError("");
    setHistoryKey((k) => k + 1);
  }, []);

  const discard = useCallback(() => {
    setDraft({});
    setError("");
  }, []);

  /** Swap in a fresh copy from a link change; the draft is kept. */
  const replace = useCallback(
    (next: Detail) => {
      // A read started before this write would bring the old links back: drop it.
      reads.current++;
      adopt(next);
      setHistoryKey((k) => k + 1);
    },
    [adopt],
  );

  /** Soft-delete. The page shows it deleted even if the refresh after fails. */
  const remove = useCallback(async () => {
    await deleteEntity(kind, id);
    const deletedAt = new Date().toISOString();
    latest.current = { ...latest.current, dirty: false };
    setDraft({});
    setConflict(null);
    setDetail((prev) => (prev && !prev.deleted_at ? { ...prev, deleted_at: deletedAt } : prev));
    setHistoryKey((k) => k + 1);
    await reload();
  }, [kind, id, reload]);

  const restore = useCallback(async () => {
    const next = await restoreEntity(kind, id);
    reads.current++;
    latest.current = { ...latest.current, detail: next };
    setDetail(next);
    setHistoryKey((k) => k + 1);
  }, [kind, id]);

  return useMemo(
    () => ({
      detail,
      loadError,
      draft,
      dirty,
      saving,
      error,
      setError,
      conflict,
      historyKey,
      value,
      set,
      save,
      keepMine,
      takeTheirs,
      discard,
      replace,
      reload,
      remove,
      restore,
    }),
    [
      detail,
      loadError,
      draft,
      dirty,
      saving,
      error,
      conflict,
      historyKey,
      value,
      set,
      save,
      keepMine,
      takeTheirs,
      discard,
      replace,
      reload,
      remove,
      restore,
    ],
  );
}

export type EntityEditor<K extends EntityKind> = ReturnType<typeof useEntityEditor<K>>;

function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined ? null : v);
  return norm(a) === norm(b);
}
