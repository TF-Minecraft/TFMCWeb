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
 * only those fields with the version the draft was started from; if someone else saved
 * first, the server's copy lands in `conflict` and the draft is kept until the user picks.
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
  /** The record shown, read by async callbacks, which must not act on what their closure saw. */
  const latest = useRef<Detail | null>(detail);
  /** The draft as of the last change, ahead of the render that shows it. */
  const draftNow = useRef<Record<string, unknown>>({});
  /** The version the draft was started from, sent with it; null while there is no draft. */
  const base = useRef<number | null>(null);
  /** The fields a save in flight sent; edits to them are kept until its answer is known. */
  const sending = useRef<Record<string, unknown> | null>(null);
  /** The record this editor is for; responses for an earlier one are dropped. */
  const target = useRef(`${kind}:${id}`);
  /** Bumped by every read; only the newest read in flight may land. */
  const reads = useRef(0);

  const show = useCallback((next: Detail | null) => {
    latest.current = next;
    setDetail(next);
  }, []);

  /** Swap the draft; a draft started from nothing is based on the version shown now. */
  const writeDraft = useCallback((next: Record<string, unknown>) => {
    draftNow.current = next;
    if (Object.keys(next).length === 0) base.current = null;
    else if (base.current === null) base.current = latest.current?.version ?? null;
    setDraft(next);
  }, []);

  /** Show a fresh copy; a version other than the draft's base is a conflict, not a silent rebase. */
  const adopt = useCallback(
    (next: Detail) => {
      const shown = latest.current;
      if (shown && next.version < shown.version) return;
      show(next);
      if (base.current !== null && next.version !== base.current) setConflict({ theirs: next });
    },
    [show],
  );

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
    sending.current = null;
    show(null);
    writeDraft({});
    setConflict(null);
    setError("");
    setLoadError("");
    getEntity(kind, id)
      .then((next) => current() && show(next))
      .catch((err) => current() && setLoadError(loreErrorMessage(err)));
  }, [kind, id, show, writeDraft]);

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
      const copy = { ...draftNow.current };
      const shown = latest.current as Record<string, unknown> | null;
      // A field a pending save sent may come back changed, so an edit back to the shown
      // value is still an edit until the save answers.
      const pending = sending.current !== null && field in sending.current;
      if (!pending && sameValue(shown?.[field], next)) delete copy[field];
      else copy[field] = next;
      writeDraft(copy);
    },
    [writeDraft],
  );

  const sendDraft = useCallback(
    async (version: number, values: Record<string, unknown>) => {
      const key = `${kind}:${id}`;
      setSaving(true);
      setError("");
      sending.current = values;
      try {
        const saved = await updateEntity(kind, id, version, values);
        if (target.current !== key) return false;
        // Reads started before the save would show the old version: drop them.
        reads.current++;
        show(saved);
        // Keep edits made while the save was in flight, now based on the saved version.
        const left: Record<string, unknown> = {};
        for (const [field, v] of Object.entries(draftNow.current)) {
          if (field in values && sameValue(values[field], v)) continue;
          if (sameValue((saved as Record<string, unknown>)[field], v)) continue;
          left[field] = v;
        }
        base.current = null;
        writeDraft(left);
        setConflict(null);
        setHistoryKey((k) => k + 1);
        return true;
      } catch (err) {
        if (target.current !== key) return false;
        const theirs = conflictCurrent<Detail>(err);
        if (theirs) {
          reads.current++;
          show(theirs);
          setConflict({ theirs });
        } else {
          // Nothing changed: edits kept only because the save was pending can go.
          const shown = (latest.current ?? {}) as Record<string, unknown>;
          const left: Record<string, unknown> = {};
          for (const [field, v] of Object.entries(draftNow.current)) {
            if (!sameValue(shown[field], v)) left[field] = v;
          }
          writeDraft(left);
          setError(loreErrorMessage(err));
        }
        return false;
      } finally {
        if (target.current === key) {
          sending.current = null;
          setSaving(false);
        }
      }
    },
    [kind, id, show, writeDraft],
  );

  const save = useCallback(async () => {
    const shown = latest.current;
    if (!shown || Object.keys(draftNow.current).length === 0) return true;
    return sendDraft(base.current ?? shown.version, draftNow.current);
  }, [sendDraft]);

  /** After a conflict: send my draft again on top of their version. */
  const keepMine = useCallback(async () => {
    if (!conflict) return false;
    return sendDraft(conflict.theirs.version, draftNow.current);
  }, [conflict, sendDraft]);

  /** After a conflict: drop my draft and show their version. */
  const takeTheirs = useCallback(() => {
    writeDraft({});
    setConflict(null);
    setError("");
    setHistoryKey((k) => k + 1);
  }, [writeDraft]);

  const discard = useCallback(() => {
    writeDraft({});
    setError("");
  }, [writeDraft]);

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
    writeDraft({});
    setConflict(null);
    const shown = latest.current;
    if (shown && !shown.deleted_at) show({ ...shown, deleted_at: deletedAt });
    setHistoryKey((k) => k + 1);
    await reload();
  }, [kind, id, reload, show, writeDraft]);

  const restore = useCallback(async () => {
    const next = await restoreEntity(kind, id);
    reads.current++;
    show(next);
    setHistoryKey((k) => k + 1);
  }, [kind, id, show]);

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
