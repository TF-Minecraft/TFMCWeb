"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Whether a record page is being edited. Pages open to read; Edit switches to the
 * form. A link ending in `?edit=1` (a record just made) opens straight in edit mode,
 * and the flag is then dropped from the address so a reload opens it to read.
 */
export function useEditMode(): [boolean, (editing: boolean) => void] {
  const params = useSearchParams();
  const asked = params.get("edit") === "1";
  const [editing, setEditing] = useState(asked);

  useEffect(() => {
    if (!asked) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [asked]);

  return [editing, setEditing];
}
