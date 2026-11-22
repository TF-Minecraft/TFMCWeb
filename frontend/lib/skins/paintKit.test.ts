import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildModelBuffers, type ModelElement, type WikiBlockModel } from "../../app/components/wiki/modelGeometry";
import { bakeElement, buildPaintKit, rotationMatrix, zyxEuler } from "./paintKit";
import { VEHICLE_SKINS, vehicleModelUrl } from "./vehicleSkins";

const PUBLIC = join(__dirname, "..", "..", "public");

/** Vertex positions the viewer draws for one element. */
function positions(el: ModelElement): number[] {
  return buildModelBuffers({ elements: [el] }, 1, () => 0)[0]!.position;
}

function baked(el: ModelElement): ModelElement {
  const b = bakeElement(el);
  return {
    from: b.from,
    to: b.to,
    faces: el.faces,
    rotation: { origin: b.origin, euler: b.rotation, order: "ZYX" },
  };
}

/** Largest distance (in blocks) between where the viewer draws a cube and its baked copy. */
function drift(el: ModelElement): number {
  const want = positions(el);
  const got = positions(baked(el));
  if (got.length !== want.length) return Infinity;
  let worst = 0;
  for (let i = 0; i < got.length; i++) worst = Math.max(worst, Math.abs(got[i]! - want[i]!));
  return worst;
}

describe("vehicle paint kit", () => {
  it("decomposes rotations back into the same Blockbench angles", () => {
    for (const euler of [
      [10, 20, 30],
      [-90, -20, 90],
      [0, -110, 0],
      [45, 0, 0],
    ] as [number, number, number][]) {
      const m = rotationMatrix({ origin: [0, 0, 0], euler, order: "ZYX" });
      const again = rotationMatrix({ origin: [0, 0, 0], euler: zyxEuler(m), order: "ZYX" });
      again.forEach((v, i) => expect(v).toBeCloseTo(m[i]!, 6));
    }
  });

  it("puts every cube of every vehicle exactly where the preview draws it", () => {
    for (const vehicle of VEHICLE_SKINS) {
      const model = JSON.parse(readFileSync(join(PUBLIC, vehicleModelUrl(vehicle.id)), "utf8")) as WikiBlockModel;
      const worst = Math.max(0, ...(model.elements ?? []).map(drift));
      // 1e-3 blocks is a 60th of a pixel.
      expect(worst, vehicle.id).toBeLessThan(1e-3);
    }
  });

  it("keeps faces on their texture and scales UVs to each texture's pixels", () => {
    const model: WikiBlockModel = {
      elements: [
        {
          from: [0, 0, 0],
          to: [2, 2, 2],
          parentRotations: [{ origin: [1, 1, 1], euler: [0, 22.5, 0], order: "ZYX" }],
          faces: {
            north: { uv: [0, 0, 8, 8], texture: "#7" },
            up: { uv: [8, 8, 16, 16], texture: "#9", rotation: 90 },
            down: { uv: [0, 0, 1, 1] },
          },
        },
      ],
    };
    const kit = buildPaintKit("toy", model, [
      { key: "7", width: 64, height: 32, dataUrl: "data:image/png;base64,AA==" },
      { key: "9", width: 16, height: 16, dataUrl: "data:image/png;base64,BB==" },
    ]) as {
      meta: { model_format: string };
      elements: {
        faces: Record<string, { uv: number[]; texture: number | null; rotation?: number }>;
        rotation?: number[];
      }[];
      textures: { name: string; uv_width: number; source: string }[];
      outliner: string[];
    };
    expect(kit.meta.model_format).toBe("free");
    expect(kit.textures.map((t) => t.name)).toEqual(["toy_0.png", "toy_1.png"]);
    const faces = kit.elements[0]!.faces;
    expect(faces.north).toEqual({ uv: [0, 0, 32, 16], texture: 0 });
    expect(faces.up).toEqual({ uv: [8, 8, 16, 16], texture: 1, rotation: 90 });
    expect(faces.down!.texture).toBeNull();
    // Faces the preview dropped are written blank: Blockbench reads all six.
    expect(Object.keys(faces).sort()).toEqual(["down", "east", "north", "south", "up", "west"]);
    expect(faces.east).toEqual({ uv: [0, 0, 0, 0], texture: null });
    expect(kit.elements[0]!.rotation).toEqual([0, 22.5, 0]);
    expect(kit.outliner).toHaveLength(1);
    // Nothing of the rig: no groups, bones or animations.
    expect(Object.keys(kit)).not.toContain("animations");
    expect(Object.keys(kit)).not.toContain("groups");
  });
});
