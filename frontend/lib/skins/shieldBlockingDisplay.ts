import type { DisplayTab, HandTabName } from "./displayTransform";
import { resolveHandDisplayTab } from "./handDisplay";
import type { JavaModelJson } from "./javaModel";
import constants from "../../../shared/skins/pack_model_constants.json";

type Vec3 = [number, number, number];

const ROUND_BLOCKING_DELTA_TP = constants.shield.round_blocking_delta as unknown as Record<
  HandTabName,
  { rotation: Vec3; translation: Vec3 }
>;

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Idle + round blocking Δ from shared pack_model_constants.json
 * (matches ProvinceSystem pack_models.shield).
 */
export function resolveShieldBlockingTab(
  json: JavaModelJson & { display?: Record<string, unknown> },
  tabName: HandTabName = "thirdperson_righthand",
): Required<DisplayTab> {
  const idle = resolveHandDisplayTab(json, tabName === "thirdperson_lefthand", "shield");
  const delta = ROUND_BLOCKING_DELTA_TP[tabName];
  return {
    rotation: addVec3(idle.rotation, delta.rotation),
    translation: addVec3(idle.translation, delta.translation),
    scale: [...idle.scale],
  };
}
