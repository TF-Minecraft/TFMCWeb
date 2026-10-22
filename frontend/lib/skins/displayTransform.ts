import * as THREE from "three";
import type { JavaModelJson } from "./javaModel";

export type DisplayTabName =
  | "thirdperson_righthand"
  | "thirdperson_lefthand"
  | "firstperson_righthand"
  | "firstperson_lefthand"
  | "ground"
  | "gui"
  | "fixed"
  | "head";

export type DisplayTab = {
  rotation?: [number, number, number];
  translation?: [number, number, number];
  scale?: [number, number, number];
};

/** No display transform — mesh sits at the mannequin slot frame only. */
const IDENTITY_TAB: Required<DisplayTab> = {
  rotation: [0, 0, 0],
  translation: [0, 0, 0],
  scale: [1, 1, 1],
};

export type DisplayKind = "item_3d" | "gun" | "shield" | "helmet_3d" | "mask" | string;

function asVec3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(value) || value.length < 3) return fallback;
  const x = Number(value[0]);
  const y = Number(value[1]);
  const z = Number(value[2]);
  if (![x, y, z].every(Number.isFinite)) return fallback;
  return [x, y, z];
}

export function normalizeTab(raw: unknown): Required<DisplayTab> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    rotation: asVec3(src.rotation, IDENTITY_TAB.rotation),
    translation: asVec3(src.translation, IDENTITY_TAB.translation),
    scale: asVec3(src.scale, IDENTITY_TAB.scale),
  };
}

/**
 * Preview display from the model JSON only.
 * Missing tab → identity (slot frame alone). Hand slots use resolveHandDisplayTab (handDisplay.ts).
 */
export function resolveDisplayTab(
  json: JavaModelJson & { display?: Record<string, unknown> },
  tabName: DisplayTabName,
  _kind?: DisplayKind,
): Required<DisplayTab> {
  const submitted = json.display?.[tabName];
  if (isTabObject(submitted)) {
    return normalizeTab(submitted);
  }
  return { ...IDENTITY_TAB };
}

/** A display tab must be a JSON object; the pack ignores anything else. */
export function isTabObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type HandTabName = Extract<DisplayTabName, "thirdperson_righthand" | "thirdperson_lefthand">;

export function handTabName(leftHand: boolean): HandTabName {
  return leftHand ? "thirdperson_lefthand" : "thirdperson_righthand";
}

/**
 * Apply Minecraft item display transform to a Three.js object.
 * Translation stays in model units (1 unit = 1/16 block), matching javaModel meshes.
 * Rotation order XYZ matches Minecraft ItemTransform euler.
 *
 * When `leftHand` is true, matches ItemTransform.apply(leftHand):
 * negate translation X and rotation Y/Z. Scale and geometry are not mirrored.
 * Pass the *lefthand* display tab with leftHand on the left arm.
 */
export function applyDisplayToObject(obj: THREE.Object3D, tab: DisplayTab, options?: { leftHand?: boolean }): void {
  const rotation = tab.rotation ?? [0, 0, 0];
  const translation = tab.translation ?? [0, 0, 0];
  const scale = tab.scale ?? [1, 1, 1];
  const mx = options?.leftHand === true ? -1 : 1;

  obj.position.set(translation[0] * mx, translation[1], translation[2]);
  obj.rotation.order = "XYZ";
  obj.rotation.set(
    THREE.MathUtils.degToRad(rotation[0]),
    THREE.MathUtils.degToRad(rotation[1] * mx),
    THREE.MathUtils.degToRad(rotation[2] * mx),
  );
  obj.scale.set(scale[0], scale[1], scale[2]);
}
