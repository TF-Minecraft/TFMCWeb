import { fetchMapJson } from "@/lib/map/api";

import type { BattleReport, WarListResponse, WarPageModel } from "./types";

/** War reads follow the map's access rules, so a staff map passes the session token. */
export function fetchWarList(mapId: string, sessionToken?: string | null): Promise<WarListResponse> {
  return fetchMapJson<WarListResponse>(warListPath(mapId), { sessionToken });
}

export function fetchWar(mapId: string, warKey: string, sessionToken?: string | null): Promise<WarPageModel> {
  return fetchMapJson<WarPageModel>(warPath(mapId, warKey), { sessionToken });
}

export function fetchBattleReport(
  mapId: string,
  warKey: string,
  recordId: string,
  sessionToken?: string | null,
): Promise<BattleReport> {
  return fetchMapJson<BattleReport>(battlePath(mapId, warKey, recordId), { sessionToken });
}

export function warListPath(mapId: string): string {
  return `/${encodeURIComponent(mapId)}/wars`;
}

export function warPath(mapId: string, warKey: string): string {
  return `${warListPath(mapId)}/${encodeURIComponent(warKey)}`;
}

export function battlePath(mapId: string, warKey: string, recordId: string): string {
  return `${warPath(mapId, warKey)}/battles/${encodeURIComponent(recordId)}`;
}

/** `?map=` as one string, or null. */
export function mapParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? raw : null;
}

/** A route segment decoded once; a malformed escape is kept as typed. */
export function routeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
