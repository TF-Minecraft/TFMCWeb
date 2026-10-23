import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  JAVA_MODEL_BOUNDS_ERROR,
  JAVA_MODEL_FACE_ROTATION_ERROR,
  JAVA_MODEL_ITEM_WRAPPER_ERROR,
  JAVA_MODEL_NO_ELEMENTS_ERROR,
  JAVA_MODEL_PROJECT_FILE_ERROR,
  JAVA_MODEL_ROTATION_ERROR,
  type JavaModelJson,
  assertVanillaJavaBlockModel,
  buildJavaModelGroup,
  parseJavaModelJson,
} from "./javaModel";

function cube(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    from: [7, 0, 7],
    to: [9, 16, 9],
    faces: { north: { uv: [0, 0, 2, 16], texture: "#0" } },
    ...overrides,
  };
}

function classicKnife(): Record<string, unknown> {
  return {
    format_version: "1.9.0",
    credit: "Made with Blockbench",
    textures: { "0": "tfmc_submissions:item/knife", particle: "x" },
    elements: [
      cube({
        rotation: { angle: 0, axis: "y", origin: [7, 8.5, 7] },
      }),
    ],
  };
}

function modernWithGroups(): Record<string, unknown> {
  return {
    format_version: "1.21.11",
    gui_light: "front",
    groups: [{ name: "doctorscane", origin: [8, 8, 8], children: [0] }],
    textures: { "0": "tfmc_submissions:item/staff" },
    elements: [
      cube({
        rotation: { angle: 22.5, axis: "x", origin: [8, 8, 8] },
      }),
    ],
    display: { gui: { rotation: [30, 225, 0] } },
  };
}

describe("assertVanillaJavaBlockModel", () => {
  it("accepts a classic Blockbench Java Block/Item export", () => {
    expect(() => assertVanillaJavaBlockModel(classicKnife())).not.toThrow();
  });

  it("accepts 1.21.11 exports that still use vanilla rotations and groups", () => {
    expect(() => assertVanillaJavaBlockModel(modernWithGroups())).not.toThrow();
  });

  it("rejects xyz Euler cube rotation", () => {
    const model = modernWithGroups();
    (model.elements as unknown[]).push(
      cube({
        rotation: { x: -75, y: -20, z: 15, origin: [7.6, 25.3, 2.1] },
      }),
    );
    expect(() => assertVanillaJavaBlockModel(model)).toThrow(JAVA_MODEL_ROTATION_ERROR);
  });

  it("accepts any multiple of 22.5° on one axis", () => {
    for (const angle of [67.5, -67.5, 90, -112.5, 135, 180, -360]) {
      const model = classicKnife();
      (model.elements as Record<string, unknown>[])[0].rotation = { angle, axis: "z", origin: [8, 8, 8] };
      expect(() => assertVanillaJavaBlockModel(model), String(angle)).not.toThrow();
    }
  });

  it("rejects angles off the 22.5° grid", () => {
    for (const angle of [30, 67, 100]) {
      const model = classicKnife();
      (model.elements as Record<string, unknown>[])[0].rotation = { angle, axis: "y", origin: [8, 8, 8] };
      expect(() => assertVanillaJavaBlockModel(model), String(angle)).toThrow(JAVA_MODEL_ROTATION_ERROR);
    }
  });

  it("rejects face texture rotations Minecraft cannot load", () => {
    const model = classicKnife();
    (model.elements as Record<string, unknown>[])[0].faces = { north: { texture: "#0", rotation: 45 } };
    expect(() => assertVanillaJavaBlockModel(model)).toThrow(JAVA_MODEL_FACE_ROTATION_ERROR);
  });

  it("rejects rotation arrays", () => {
    const model = classicKnife();
    (model.elements as Record<string, unknown>[])[0].rotation = [0, 45, 0];
    expect(() => assertVanillaJavaBlockModel(model)).toThrow(JAVA_MODEL_ROTATION_ERROR);
  });

  it("rejects empty elements", () => {
    expect(() => assertVanillaJavaBlockModel({ elements: [] })).toThrow(JAVA_MODEL_NO_ELEMENTS_ERROR);
  });

  it("rejects 1.21 item wrappers", () => {
    expect(() =>
      assertVanillaJavaBlockModel({
        model: {
          type: "minecraft:model",
          model: "tfmc_submissions:item/staff",
        },
      }),
    ).toThrow(JAVA_MODEL_ITEM_WRAPPER_ERROR);
  });

  it("rejects Blockbench project meta", () => {
    expect(() =>
      assertVanillaJavaBlockModel({
        meta: { format_version: "4.10" },
        elements: [cube()],
      }),
    ).toThrow(JAVA_MODEL_PROJECT_FILE_ERROR);
  });

  it("rejects textures arrays", () => {
    expect(() =>
      assertVanillaJavaBlockModel({
        textures: [{ name: "0", source: "data:image/png" }],
        elements: [cube()],
      }),
    ).toThrow(JAVA_MODEL_PROJECT_FILE_ERROR);
  });

  it("rejects cubes outside -16..32", () => {
    const model = classicKnife();
    (model.elements as Record<string, unknown>[])[0].from = [7, 40, 7];
    (model.elements as Record<string, unknown>[])[0].to = [8, 41, 8];
    expect(() => assertVanillaJavaBlockModel(model)).toThrow(JAVA_MODEL_BOUNDS_ERROR);
  });
});

describe("parseJavaModelJson", () => {
  it("parses valid JSON", () => {
    const out = parseJavaModelJson(JSON.stringify(classicKnife()));
    expect(out.elements).toHaveLength(1);
  });

  it("rejects xyz rotation at parse time", () => {
    const model = classicKnife();
    (model.elements as Record<string, unknown>[])[0].rotation = {
      x: -75,
      y: -20,
      z: 15,
      origin: [8, 8, 8],
    };
    expect(() => parseJavaModelJson(JSON.stringify(model))).toThrow(JAVA_MODEL_ROTATION_ERROR);
  });
});

describe("parseJavaModelJson x/y/z rotation", () => {
  it("reads a one-axis x/y/z rotation as axis and angle", () => {
    const model = classicKnife();
    (model.elements as Record<string, unknown>[])[0].rotation = { x: 0, y: 67.5, z: 0, origin: [8, 8, 8] };
    const parsed = parseJavaModelJson(JSON.stringify(model));
    expect(parsed.elements?.[0].rotation).toMatchObject({ axis: "y", angle: 67.5, origin: [8, 8, 8] });
  });
});

describe("buildJavaModelGroup face rotation", () => {
  function northUvAt(rotation: number, x: number, y: number): [number, number] {
    const json = {
      elements: [
        { from: [0, 0, 0], to: [16, 16, 16], faces: { north: { uv: [0, 0, 16, 16], texture: "#0", rotation } } },
      ],
    } as unknown as JavaModelJson;
    const group = buildJavaModelGroup(json, new THREE.Texture(), 16, 16, { center: false });
    let mesh: THREE.Mesh | undefined;
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) mesh = obj;
    });
    const pos = mesh!.geometry.getAttribute("position");
    const uv = mesh!.geometry.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      if (pos.getX(i) === x && pos.getY(i) === y) return [uv.getX(i), uv.getY(i)];
    }
    throw new Error("corner not found");
  }

  it("turns the texture clockwise like Minecraft", () => {
    // From the north, x = 16 is the top-left corner. At 90° it shows the texture's bottom-left.
    expect(northUvAt(0, 16, 16)).toEqual([0, 1]);
    expect(northUvAt(90, 16, 16)).toEqual([0, 0]);
    expect(northUvAt(270, 16, 16)).toEqual([1, 1]);
  });
});
