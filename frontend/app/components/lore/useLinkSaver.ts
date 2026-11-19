"use client";

import { useRef, useState } from "react";

import { loreErrorMessage } from "@/lib/lore/api";

/**
 * Runs a page's link changes one at a time and hands each fresh record to `onChange`.
 * Every link write returns the whole record, so two in flight could land out of order
 * and undo each other. While one runs `busy` is set and further runs are refused, so each
 * change is built from the last confirmed lists. `errorFor(section)` is the message for
 * the section whose change failed; `onError` may replace it (return a string) after
 * reacting to the failure.
 */
export function useLinkSaver<T>(onChange: (next: T) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ section: string; message: string } | null>(null);
  const running = useRef(false);

  async function run(
    section: string,
    action: () => Promise<T>,
    onError?: (err: unknown) => Promise<string | void> | string | void,
  ): Promise<boolean> {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
      return true;
    } catch (err) {
      const message = (await onError?.(err)) || loreErrorMessage(err);
      setError({ section, message });
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return {
    busy,
    run,
    errorFor: (section: string) => (error?.section === section ? error.message : ""),
  };
}

export type LinkSaver<T> = ReturnType<typeof useLinkSaver<T>>;
