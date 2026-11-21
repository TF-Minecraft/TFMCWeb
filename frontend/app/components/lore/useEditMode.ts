"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export type EditMode = {
  editing: boolean;
  /** Done is saving: the page locks, showing what is being saved, so nothing typed now is left unsaved. */
  finishing: boolean;
  setEditing: (editing: boolean) => void;
  /** Done: runs `save` with the form locked and goes back to reading when it reports success. */
  finish: (save: () => Promise<boolean | void>) => Promise<void>;
};

/**
 * Whether a record page is being edited. Pages open to read; Edit switches to the
 * form. A link ending in `?edit=1` (a record just made) opens straight in edit mode,
 * and the flag is then dropped from the address so a reload opens it to read.
 */
export function useEditMode(): EditMode {
  const params = useSearchParams();
  const asked = params.get("edit") === "1";
  const [editing, setEditing] = useState(asked);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!asked) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [asked]);

  async function finish(save: () => Promise<boolean | void>) {
    setFinishing(true);
    try {
      if (await save()) setEditing(false);
    } finally {
      setFinishing(false);
    }
  }

  return { editing, finishing, setEditing, finish };
}
