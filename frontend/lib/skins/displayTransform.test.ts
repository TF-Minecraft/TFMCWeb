import * as THREE from "three";
import { describe, expect, it } from "vitest";
import constants from "../../../shared/skins/pack_model_constants.json";
import { applyDisplayToObject, type DisplayTab } from "./displayTransform";
import { resolveHandDisplayTab } from "./handDisplay";

const right: Required<DisplayTab> = { rotation: [10, 20, 30], translation: [1, 2, 3], scale: [1, 1, 1] };
const left: Required<DisplayTab> = { rotation: [40, 50, 60], translation: [4, 5, 6], scale: [2, 2, 2] };

describe("resolveHandDisplayTab", () => {
  it("uses the model's own tab for each hand", () => {
    const json = { elements: [], display: { thirdperson_righthand: right, thirdperson_lefthand: left } };
    expect(resolveHandDisplayTab(json, true, "item_3d")).toEqual(left);
    expect(resolveHandDisplayTab(json, false, "item_3d")).toEqual(right);
  });

  it("falls back to the tab the pack fills in, not the other hand", () => {
    const json = { elements: [], display: { thirdperson_righthand: right } };
    expect(resolveHandDisplayTab(json, true, "item_3d")).toEqual(constants.preview.generated_tp.thirdperson_lefthand);
    expect(resolveHandDisplayTab(json, true, "shield")).toEqual(constants.shield.round_idle.thirdperson_lefthand);
    expect(resolveHandDisplayTab(json, true, "crossbow_3d")).toEqual(
      constants.preview.crossbow_tp.thirdperson_lefthand,
    );
    expect(resolveHandDisplayTab({ elements: [] }, false, "bow_3d")).toEqual(
      constants.preview.bow_tp.thirdperson_righthand,
    );
  });

  it("ignores a tab that is not an object, as the pack does", () => {
    const json = { elements: [], display: { thirdperson_lefthand: [0, 0, 0] } };
    expect(resolveHandDisplayTab(json, true, "item_3d")).toEqual(constants.preview.generated_tp.thirdperson_lefthand);
  });
});

describe("applyDisplayToObject", () => {
  it("mirrors translation X and rotation Y/Z for the left hand but not scale", () => {
    const obj = new THREE.Object3D();
    applyDisplayToObject(obj, left, { leftHand: true });
    expect(obj.position.toArray()).toEqual([-4, 5, 6]);
    expect(obj.rotation.x).toBeCloseTo(THREE.MathUtils.degToRad(40));
    expect(obj.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(-50));
    expect(obj.rotation.z).toBeCloseTo(THREE.MathUtils.degToRad(-60));
    expect(obj.scale.toArray()).toEqual([2, 2, 2]);
  });
});
