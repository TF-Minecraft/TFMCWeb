import * as THREE from "three";

export type JavaModelJson = {
  textures?: Record<string, string>;
  elements?: JavaElement[];
  display?: Record<string, unknown>;
};

export type BuildJavaModelOptions = {
  /**
   * Freestanding preview: shift by mesh AABB center.
   * Off (mannequin / display): map 16³ center (8,8,8) to local 0 via
   * MODEL_WORKSPACE_ORIGIN. Slot attach is separate (HAND_SOCKET / HEAD_SOCKET).
   */
  center?: boolean;
};

/**
 * Offset so Blockbench/MC workspace center (8, 8, 8) of the 16×16×16 cube
 * becomes local origin. Display scale/rotation use this pivot on the mesh only —
 * independent of mannequin slot tip offsets.
 */
export const MODEL_WORKSPACE_ORIGIN: [number, number, number] = [-8, -8, -8];

type JavaElement = {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: {
    origin: [number, number, number];
    axis: "x" | "y" | "z";
    angle: number;
    rescale?: boolean;
  };
  faces?: Partial<Record<FaceName, JavaFace>>;
};

type FaceName = "north" | "east" | "south" | "west" | "up" | "down";

type JavaFace = {
  uv?: [number, number, number, number];
  texture?: string;
  rotation?: number;
};

const FACE_DIRS: Record<FaceName, { normal: [number, number, number]; corners: number[][] }> = {
  // corners in MC face order for UV mapping (matching common viewers)
  north: {
    normal: [0, 0, -1],
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
    ],
  },
  south: {
    normal: [0, 0, 1],
    corners: [
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
      [1, 0, 1],
    ],
  },
  west: {
    normal: [-1, 0, 0],
    corners: [
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
    ],
  },
  east: {
    normal: [1, 0, 0],
    corners: [
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 0],
    ],
  },
  up: {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  down: {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
};

/**
 * Vanilla face `rotation` turns the texture clockwise: corner i samples the UV
 * of corner i + 1 for each 90° (Minecraft Quadrant.rotateVertexIndex).
 */
function rotateUv(uvs: [number, number][], rotation: number): [number, number][] {
  const turns = (((rotation % 360) + 360) % 360) / 90;
  const out = uvs.slice() as [number, number][];
  for (let i = 0; i < turns; i++) {
    out.push(out.shift()!);
  }
  return out;
}

function faceUvs(face: FaceName, uv: [number, number, number, number], rotation = 0): [number, number][] {
  // Java models: UV is in 1/16ths of a block; 0–16 spans the full texture
  // regardless of PNG resolution (16×16, 64×64, …).
  const u1 = uv[0] / 16;
  const v1 = uv[1] / 16;
  const u2 = uv[2] / 16;
  const v2 = uv[3] / 16;
  // MC V grows down; Three UV V grows up.
  // Side faces (incl. plume): U is mirrored vs an earlier naive mapping.
  // Up/down use a different U↔corner convention in MC — after the side fix they
  // need a 180° UV turn (two clockwise steps), not another U mirror.
  let corners: [number, number][];
  if (face === "up" || face === "down") {
    corners = [
      [u1, 1 - v2],
      [u2, 1 - v2],
      [u2, 1 - v1],
      [u1, 1 - v1],
    ];
  } else {
    corners = [
      [u2, 1 - v1],
      [u1, 1 - v1],
      [u1, 1 - v2],
      [u2, 1 - v2],
    ];
  }
  return rotateUv(corners, rotation);
}

function defaultUv(
  face: FaceName,
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number, number] {
  const [x0, y0, z0] = from;
  const [x1, y1, z1] = to;
  switch (face) {
    case "north":
    case "south":
      return [x0, 16 - y1, x1, 16 - y0];
    case "west":
    case "east":
      return [z0, 16 - y1, z1, 16 - y0];
    case "up":
    case "down":
      return [x0, z0, x1, z1];
  }
}

/**
 * Build a Three.js group from a Minecraft Java item/block model JSON
 * and a single resolved texture (all #refs map to this image).
 */
export function buildJavaModelGroup(
  json: JavaModelJson,
  texture: THREE.Texture,
  texWidth: number,
  texHeight: number,
  options: BuildJavaModelOptions = {},
): THREE.Group {
  const center = options.center !== false;
  const elements = json.elements;
  if (!elements || elements.length === 0) {
    throw new Error("Model has no elements");
  }

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const root = new THREE.Group();
  root.name = "javaModel";
  // Geometry stays in absolute 0–16 space under `content`; root origin is the
  // display/scale pivot (16³ center when not AABB-centered).
  const content = new THREE.Group();
  content.name = "javaModelContent";
  root.add(content);

  for (const el of elements) {
    if (!el.from || !el.to) continue;
    const [fx, fy, fz] = el.from;
    const [tx, ty, tz] = el.to;
    const sizeX = tx - fx;
    const sizeY = ty - fy;
    const sizeZ = tz - fz;
    if (sizeX === 0 && sizeY === 0 && sizeZ === 0) continue;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    const faces = el.faces || {};
    for (const faceName of Object.keys(FACE_DIRS) as FaceName[]) {
      const face = faces[faceName];
      if (!face) continue;

      const def = FACE_DIRS[faceName];
      const uvRect = face.uv ?? defaultUv(faceName, el.from, el.to);
      const cornerUvs = faceUvs(faceName, uvRect, face.rotation ?? 0);

      for (let i = 0; i < 4; i++) {
        const [cx, cy, cz] = def.corners[i];
        positions.push(fx + cx * sizeX, fy + cy * sizeY, fz + cz * sizeZ);
        normals.push(...def.normal);
        uvs.push(cornerUvs[i][0], cornerUvs[i][1]);
      }
      indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2, vertexOffset, vertexOffset + 2, vertexOffset + 3);
      vertexOffset += 4;
    }

    if (positions.length === 0) continue;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeBoundingBox();

    const mesh = new THREE.Mesh(geo, material);

    if (el.rotation) {
      const [ox, oy, oz] = el.rotation.origin;
      const pivot = new THREE.Group();
      pivot.position.set(ox, oy, oz);
      mesh.position.set(-ox, -oy, -oz);
      const angle = THREE.MathUtils.degToRad(el.rotation.angle);
      if (el.rotation.axis === "x") pivot.rotation.x = angle;
      if (el.rotation.axis === "y") pivot.rotation.y = angle;
      if (el.rotation.axis === "z") pivot.rotation.z = angle;
      pivot.add(mesh);
      content.add(pivot);
    } else {
      content.add(mesh);
    }
  }

  if (center) {
    // Freestanding: frame on mesh bounds (not used for display slots).
    const box = new THREE.Box3().setFromObject(content);
    const mid = box.getCenter(new THREE.Vector3());
    content.position.sub(mid);
  } else {
    // Mannequin / JSON display: scale & rotate about 16³ center (8,8,8).
    content.position.set(...MODEL_WORKSPACE_ORIGIN);
  }

  return root;
}

export const JAVA_MODEL_EXPORT_HINT = "Export in Blockbench as Java Block/Item (not Java Item).";
export const JAVA_MODEL_ROTATION_ERROR =
  "Cubes may only rotate on one axis, in steps of 22.5°. " + JAVA_MODEL_EXPORT_HINT;
export const JAVA_MODEL_FACE_ROTATION_ERROR = "Face texture rotation must be 0, 90, 180 or 270.";
export const JAVA_MODEL_NO_ELEMENTS_ERROR = "Model has no elements. " + JAVA_MODEL_EXPORT_HINT;
export const JAVA_MODEL_ITEM_WRAPPER_ERROR =
  "This looks like a Minecraft item definition, not a Java Block/Item model. " + JAVA_MODEL_EXPORT_HINT;
export const JAVA_MODEL_PROJECT_FILE_ERROR = "This looks like a Blockbench project file. " + JAVA_MODEL_EXPORT_HINT;
export const JAVA_MODEL_BOUNDS_ERROR = "Cube coordinates must be between -16 and 32.";
export const JAVA_MODEL_TEXTURES_ERROR = "Model textures must be a map of texture ids to paths.";
export const JAVA_MODEL_CUBE_ERROR = "Each cube needs from and to as three numbers.";

const ALLOWED_AXES = new Set(["x", "y", "z"]);
const ANGLE_STEP = 22.5;
const FACE_ROTATIONS = new Set([0, 90, 180, 270]);
const COORD_MIN = -16;
const COORD_MAX = 32;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Any multiple of 22.5°; the server bakes turns past ±45° into the cube. */
function angleAllowed(value: unknown): boolean {
  if (!isFiniteNumber(value)) return false;
  const steps = value / ANGLE_STEP;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

/** 1.21.11 x/y/z rotation turning on at most one axis, as [axis, angle]. */
function singleAxisEuler(rotation: Record<string, unknown>): [string, number] | null {
  const turned: [string, number][] = [];
  for (const axis of ["x", "y", "z"]) {
    const value = rotation[axis] ?? 0;
    if (!isFiniteNumber(value)) return null;
    if (Math.abs(value) > 1e-6) turned.push([axis, value]);
  }
  if (turned.length > 1) return null;
  return turned[0] ?? ["y", 0];
}

function isVec3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((n) => isFiniteNumber(n));
}

function coordsInBounds(vec: [number, number, number]): boolean {
  return vec.every((n) => n >= COORD_MIN && n <= COORD_MAX);
}

/**
 * Reject JSON Minecraft cannot load as a Java Block/Item model.
 * Extra keys (format_version, groups, gui_light) are allowed.
 */
export function assertVanillaJavaBlockModel(data: unknown): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid model JSON");
  }
  const model = data as Record<string, unknown>;
  const nested = model.model;
  if (nested && typeof nested === "object" && !Array.isArray(nested) && "type" in nested) {
    throw new Error(JAVA_MODEL_ITEM_WRAPPER_ERROR);
  }
  if ("meta" in model) {
    throw new Error(JAVA_MODEL_PROJECT_FILE_ERROR);
  }

  const textures = model.textures;
  if (textures !== undefined) {
    if (Array.isArray(textures)) {
      throw new Error(JAVA_MODEL_PROJECT_FILE_ERROR);
    }
    if (!textures || typeof textures !== "object") {
      throw new Error(JAVA_MODEL_TEXTURES_ERROR);
    }
    for (const value of Object.values(textures as Record<string, unknown>)) {
      if (typeof value !== "string") {
        throw new Error(JAVA_MODEL_TEXTURES_ERROR);
      }
    }
  }

  const elements = model.elements;
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error(JAVA_MODEL_NO_ELEMENTS_ERROR);
  }

  for (const el of elements) {
    if (!el || typeof el !== "object" || Array.isArray(el)) {
      throw new Error(JAVA_MODEL_CUBE_ERROR);
    }
    const cube = el as Record<string, unknown>;
    if (!isVec3(cube.from) || !isVec3(cube.to)) {
      throw new Error(JAVA_MODEL_CUBE_ERROR);
    }
    if (!coordsInBounds(cube.from) || !coordsInBounds(cube.to)) {
      throw new Error(JAVA_MODEL_BOUNDS_ERROR);
    }
    const faces = cube.faces;
    if (faces && typeof faces === "object" && !Array.isArray(faces)) {
      for (const face of Object.values(faces as Record<string, unknown>)) {
        if (!face || typeof face !== "object") continue;
        const faceRotation = (face as Record<string, unknown>).rotation ?? 0;
        if (typeof faceRotation !== "number" || !FACE_ROTATIONS.has(faceRotation)) {
          throw new Error(JAVA_MODEL_FACE_ROTATION_ERROR);
        }
      }
    }
    const rot = cube.rotation;
    if (rot === undefined || rot === null) continue;
    if (Array.isArray(rot) || typeof rot !== "object") {
      throw new Error(JAVA_MODEL_ROTATION_ERROR);
    }
    const rotation = rot as Record<string, unknown>;
    let axisAngle: [unknown, unknown] = [undefined, undefined];
    if ("axis" in rotation) {
      axisAngle = [rotation.axis, rotation.angle];
    } else if ("x" in rotation || "y" in rotation || "z" in rotation) {
      axisAngle = singleAxisEuler(rotation) ?? axisAngle;
    }
    const [axis, angle] = axisAngle;
    if (!ALLOWED_AXES.has(String(axis)) || !angleAllowed(angle) || !isVec3(rotation.origin)) {
      throw new Error(JAVA_MODEL_ROTATION_ERROR);
    }
  }
}

export function parseJavaModelJson(text: string): JavaModelJson {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid model JSON");
  }
  assertVanillaJavaBlockModel(data);
  const model = data as JavaModelJson;
  // Preview draws axis/angle only; x/y/z here turns on one axis at most.
  for (const el of model.elements ?? []) {
    const rotation = el.rotation as Record<string, unknown> | undefined;
    if (rotation && !("axis" in rotation)) {
      const [axis, angle] = singleAxisEuler(rotation)!;
      el.rotation = { ...el.rotation!, axis: axis as "x" | "y" | "z", angle };
    }
  }
  return model;
}

export async function assertVanillaJavaBlockModelFile(file: File): Promise<void> {
  const text = await file.text();
  parseJavaModelJson(text);
}

export async function loadTextureFromFile(
  file: File,
): Promise<{ texture: THREE.Texture; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load texture PNG"));
      img.src = url;
    });
    const texture = new THREE.Texture(image);
    texture.needsUpdate = true;
    return {
      texture,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.removeFromParent();

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry) geometries.add(child.geometry);
    const mat = child.material;
    const list = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const m of list) {
      materials.add(m);
      if (m instanceof THREE.MeshBasicMaterial && m.map) {
        textures.add(m.map);
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
