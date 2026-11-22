import type { ModelElement, ModelElementRotation, WikiBlockModel } from "../../app/components/wiki/modelGeometry";

/**
 * A Blockbench project for painting a vehicle skin in 3D: the vehicle's cubes and its original
 * textures, nothing else. It is built from the same flattened preview model the upload page
 * shows (and the wiki serves), so it holds no bones, pivots, animations or VehicleFramework bone
 * names. Each cube's chain of rotations is baked into one free rotation, which Blockbench's
 * generic ("free") format allows. Players paint on the model, save each texture
 * (`<vehicle>_<n>.png`) and upload it in slot n.
 */

export type PaintKitTexture = { key: string; width: number; height: number; dataUrl: string };

type Vec3 = [number, number, number];
type Mat3 = number[];

const BLOCKBENCH_FACES = ["north", "east", "south", "west", "up", "down"] as const;
const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Same conventions as the viewer (modelGeometry.ts): row-major, ZYX = Rz·Ry·Rx, XYZ = Rx·Ry·Rz. */
export function rotationMatrix(rotation: ModelElementRotation | undefined): Mat3 {
  if (!rotation) return IDENTITY;
  if (rotation.euler) {
    const [rx, ry, rz] = rotation.euler.map(rad) as Vec3;
    const [cx, sx, cy, sy, cz, sz] = [
      Math.cos(rx),
      Math.sin(rx),
      Math.cos(ry),
      Math.sin(ry),
      Math.cos(rz),
      Math.sin(rz),
    ];
    if (rotation.order === "ZYX") {
      return [
        cy * cz,
        sx * sy * cz - cx * sz,
        cx * sy * cz + sx * sz,
        cy * sz,
        sx * sy * sz + cx * cz,
        cx * sy * sz - sx * cz,
        -sy,
        sx * cy,
        cx * cy,
      ];
    }
    return [
      cy * cz,
      -cy * sz,
      sy,
      cx * sz + sx * sy * cz,
      cx * cz - sx * sy * sz,
      -sx * cy,
      sx * sz - cx * sy * cz,
      sx * cz + cx * sy * sz,
      cx * cy,
    ];
  }
  if (!rotation.angle || !rotation.axis) return IDENTITY;
  const t = rad(rotation.angle);
  const [c, s] = [Math.cos(t), Math.sin(t)];
  if (rotation.axis === "x") return [1, 0, 0, 0, c, -s, 0, s, c];
  if (rotation.axis === "y") return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function mul(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push(a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!);
    }
  }
  return out;
}

function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2],
    m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2],
    m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2],
  ];
}

/** Blockbench's cube rotation (ZYX, degrees) for a rotation matrix. */
export function zyxEuler(m: Mat3): Vec3 {
  const sy = -Math.max(-1, Math.min(1, m[6]!));
  if (Math.abs(sy) < 0.9999999) {
    return [deg(Math.atan2(m[7]!, m[8]!)), deg(Math.asin(sy)), deg(Math.atan2(m[3]!, m[0]!))];
  }
  return [0, deg(Math.asin(sy)), deg(Math.atan2(-m[1]!, m[4]!))];
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/**
 * One cube with its own rotation and every parent rotation folded into a single rotation
 * about the cube's centre, moved so it lands exactly where the chain put it.
 */
export function bakeElement(el: ModelElement): { from: Vec3; to: Vec3; origin: Vec3; rotation: Vec3 } {
  let r = IDENTITY;
  let c: Vec3 = [0, 0, 0];
  for (const rotation of [el.rotation, ...(el.parentRotations ?? [])]) {
    if (!rotation) continue;
    const m = rotationMatrix(rotation);
    const o = rotation.origin;
    r = mul(m, r);
    const moved = apply(m, [c[0] - o[0], c[1] - o[1], c[2] - o[2]]);
    c = [moved[0] + o[0], moved[1] + o[1], moved[2] + o[2]];
  }
  const centre: Vec3 = [(el.from[0] + el.to[0]) / 2, (el.from[1] + el.to[1]) / 2, (el.from[2] + el.to[2]) / 2];
  const rc = apply(r, centre);
  // p' = R·p + c  ==  R·(p + d − o) + o + d  with o = centre, d = c − o + R·o.
  const d: Vec3 = [c[0] - centre[0] + rc[0], c[1] - centre[1] + rc[1], c[2] - centre[2] + rc[2]];
  return {
    from: el.from.map((v, i) => round(v + d[i]!)) as Vec3,
    to: el.to.map((v, i) => round(v + d[i]!)) as Vec3,
    origin: centre.map((v, i) => round(v + d[i]!)) as Vec3,
    rotation: zyxEuler(r).map(round) as Vec3,
  };
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/** The Blockbench project as JSON (save it as `<vehicle>_paint_kit.bbmodel`). */
export function buildPaintKit(vehicleId: string, model: WikiBlockModel, textures: readonly PaintKitTexture[]): object {
  const indexByKey = new Map(textures.map((t, i) => [t.key, i]));
  const elements = (model.elements ?? []).map((el) => {
    const baked = bakeElement(el);
    const faces: Record<string, { uv: number[]; texture: number | null; rotation?: number }> = {};
    // Blockbench reads all six faces; a face the preview drops stays blank (no texture).
    for (const dir of BLOCKBENCH_FACES) {
      const face = el.faces?.[dir];
      if (!face) {
        faces[dir] = { uv: [0, 0, 0, 0], texture: null };
        continue;
      }
      const index = indexByKey.get(String(face.texture ?? "").replace(/^#/, ""));
      const texture = index === undefined ? null : textures[index]!;
      // Preview faces use a 0–16 grid per texture; Blockbench uses each texture's own pixels.
      const sx = (texture?.width ?? 16) / 16;
      const sy = (texture?.height ?? 16) / 16;
      const [u1, v1, u2, v2] = face.uv;
      faces[dir] = {
        uv: [round(u1 * sx), round(v1 * sy), round(u2 * sx), round(v2 * sy)],
        texture: index ?? null,
        ...(face.rotation ? { rotation: face.rotation } : {}),
      };
    }
    return {
      name: "cube",
      type: "cube",
      uuid: uuid(),
      box_uv: false,
      from: baked.from,
      to: baked.to,
      origin: baked.origin,
      ...(baked.rotation.some((a) => a !== 0) ? { rotation: baked.rotation } : {}),
      faces,
    };
  });
  const first = textures[0];
  return {
    meta: { format_version: "4.10", model_format: "free", box_uv: false },
    name: `${vehicleId}_paint_kit`,
    resolution: { width: first?.width ?? 16, height: first?.height ?? 16 },
    elements,
    outliner: elements.map((e) => e.uuid),
    textures: textures.map((t, i) => ({
      name: `${vehicleId}_${i}.png`,
      id: String(i),
      uuid: uuid(),
      path: "",
      width: t.width,
      height: t.height,
      uv_width: t.width,
      uv_height: t.height,
      particle: false,
      render_mode: "default",
      visible: true,
      internal: true,
      saved: false,
      source: t.dataUrl,
    })),
  };
}
