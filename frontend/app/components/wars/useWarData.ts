"use client";

import { useEffect, useState } from "react";

import { useAccessibleMaps } from "@/app/hooks/useAccessibleMaps";
import { useCharacterSessionToken } from "@/app/hooks/useCharacterSessionToken";
import { liveMapIdFrom, parseMapRouteSegment } from "@/app/lib/map/chronicleDayRoute";
import { fetchMapJson, MapAccessError, mapRequiresAuth, staffMapAccessReason } from "@/lib/map/api";

export type WarLoadError = "login" | "permission" | "not_found" | "failed";

export type WarData<T> =
  | { status: "loading"; mapId: string | null }
  | { status: "ready"; mapId: string; data: T; sessionToken: string | null }
  | { status: "error"; mapId: string | null; error: WarLoadError };

function loadError(error: unknown): WarLoadError {
  if (error instanceof MapAccessError) {
    if (error.status === 404) return "not_found";
    const reason = staffMapAccessReason(error);
    if (reason === "login" || reason === "permission") return reason;
  }
  return "failed";
}

/**
 * The map a war page reads: `?map=` when given, else the site's live map
 * (`main` on the public site, the Dev server's map on the dev site).
 */
export function useWarMap(mapParam: string | null | undefined): { mapId: string | null; invalid: boolean } {
  const { maps, loading, error } = useAccessibleMaps();
  if (mapParam != null && mapParam !== "") {
    const mapId = parseMapRouteSegment(mapParam);
    return { mapId, invalid: mapId === null };
  }
  if (loading) return { mapId: null, invalid: false };
  return { mapId: error ? "main" : liveMapIdFrom(maps), invalid: false };
}

/** Fetches `path(mapId)`, with the session token when the map is staff-only. */
export function useWarData<T>(mapParam: string | null | undefined, path: (mapId: string) => string): WarData<T> {
  const { mapId, invalid } = useWarMap(mapParam);
  const { maps, loading: mapsLoading } = useAccessibleMaps();
  const token = useCharacterSessionToken();
  const needsAuth = mapId ? mapRequiresAuth(mapId, maps) : false;
  const authToken = needsAuth ? token : null;
  // A staff map waits for the access list, which says whether it needs a token.
  const ready = mapId !== null && !(needsAuth && mapsLoading && maps.length === 0);
  const target = mapId ? path(mapId) : null;
  // Results are kept with the request they answer, so a new map or war reads as loading.
  const [result, setResult] = useState<{ key: string; state: WarData<T> } | null>(null);
  const key = `${target ?? ""}\u0000${authToken ?? ""}`;

  useEffect(() => {
    if (invalid || !ready || !mapId || !target) return;
    let current = true;
    fetchMapJson<T>(target, { sessionToken: authToken })
      .then((data) => {
        if (current) setResult({ key, state: { status: "ready", mapId, data, sessionToken: authToken } });
      })
      .catch((error: unknown) => {
        if (current) setResult({ key, state: { status: "error", mapId, error: loadError(error) } });
      });
    return () => {
      current = false;
    };
  }, [invalid, ready, mapId, target, authToken, key]);

  if (invalid) return { status: "error", mapId: null, error: "not_found" };
  if (result && result.key === key) return result.state;
  return { status: "loading", mapId };
}
