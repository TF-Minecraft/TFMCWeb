import constants from "../../../shared/skins/pack_model_constants.json";
import {
  handTabName,
  isTabObject,
  normalizeTab,
  type DisplayKind,
  type DisplayTab,
  type HandTabName,
} from "./displayTransform";
import { resolveFlatDisplayTab } from "./flatItemDisplay";
import type { JavaModelJson } from "./javaModel";

// Kept out of displayTransform.ts: the review-sheet renderer (backend/render) copies that
// file without shared/ or flatItemDisplay.ts next to it.

/** Hand tab the pack autofills when the model has none (backend display.py defaults). */
function packHandTab(kind: DisplayKind | undefined, tabName: HandTabName): Required<DisplayTab> {
  if (kind === "shield") return normalizeTab(constants.shield.round_idle[tabName]);
  if (kind === "bow_3d") return resolveFlatDisplayTab("bow", tabName);
  if (kind === "crossbow_3d") return resolveFlatDisplayTab("crossbow", tabName);
  return resolveFlatDisplayTab("generated", tabName);
}

/**
 * Thirdperson tab for the holding hand: the model's own tab for that hand, or
 * the tab the pack fills in when the model has none.
 */
export function resolveHandDisplayTab(
  json: JavaModelJson & { display?: Record<string, unknown> },
  leftHand: boolean,
  kind?: DisplayKind,
): Required<DisplayTab> {
  const tabName = handTabName(leftHand);
  const submitted = json.display?.[tabName];
  return isTabObject(submitted) ? normalizeTab(submitted) : packHandTab(kind, tabName);
}
