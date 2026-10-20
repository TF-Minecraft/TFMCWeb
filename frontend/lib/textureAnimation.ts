import limits from "../../shared/skins/base_sets.json";

/**
 * Minecraft `.png.mcmeta` texture animation: frame geometry, timing and validation.
 * Shared by the wiki station viewer and the skin previews; mirrors the skins API rules.
 */

export type TextureAnimationFrame = number | { index: number; time?: number };

export type TextureAnimationMetadata = {
  animation: {
    frametime?: number;
    width?: number;
    height?: number;
    interpolate?: boolean;
    frames?: TextureAnimationFrame[];
  };
};

export type FrameSize = { w: number; h: number };

export type ScheduledFrame = { index: number; duration: number };

/** One Minecraft game tick in milliseconds; animation times are in ticks. */
export const TICK_MS = 50;

/** Largest `.mcmeta` the skins API accepts (shared limits.mcmeta_max_bytes). */
export const MCMETA_MAX_BYTES: number = limits.limits.mcmeta_max_bytes;

const ANIMATION_KEYS = new Set(["frametime", "interpolate", "width", "height", "frames"]);

/**
 * Every number an `.mcmeta` may hold is a whole number, so any number written with a
 * decimal point or exponent (`1.0`, `2e1`) is rejected, as the API's JSON parser would.
 */
function hasNonIntegerNumber(text: string): boolean {
  const outsideStrings = text.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return /\d\s*[.eE]|\.\d/.test(outsideStrings);
}

/**
 * Frame size as Minecraft resolves it: both width and height given → that; only one →
 * the other side is the whole image; neither → a square of the shorter side.
 */
export function frameSizeFor(
  imageWidth: number,
  imageHeight: number,
  animation: TextureAnimationMetadata["animation"],
): FrameSize {
  const { width, height } = animation;
  if (width !== undefined && height !== undefined) return { w: width, h: height };
  if (width !== undefined) return { w: width, h: imageHeight };
  if (height !== undefined) return { w: imageWidth, h: height };
  const side = Math.min(imageWidth, imageHeight);
  return { w: side, h: side };
}

/** Columns × rows of frames, read left to right then top to bottom. */
export function frameGrid(
  imageWidth: number,
  imageHeight: number,
  animation: TextureAnimationMetadata["animation"],
): { size: FrameSize; columns: number; rows: number; count: number } {
  const size = frameSizeFor(imageWidth, imageHeight, animation);
  const columns = imageWidth / size.w;
  const rows = imageHeight / size.h;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) {
    throw new Error(
      `Animation frame size ${size.w}×${size.h} does not divide the ${imageWidth}×${imageHeight} texture evenly (invalid frame dimensions).`,
    );
  }
  return { size, columns, rows, count: columns * rows };
}

/** Frame order and per-frame durations (ms); default order is every frame once. */
export function frameSchedule(animation: TextureAnimationMetadata["animation"], frameCount: number): ScheduledFrame[] {
  const frameTime = animation.frametime ?? 1;
  const frames = (animation.frames ?? Array.from({ length: frameCount }, (_, i) => i)).map((frame) => ({
    index: typeof frame === "number" ? frame : frame.index,
    duration: (typeof frame === "number" ? frameTime : (frame.time ?? frameTime)) * TICK_MS,
  }));
  if (
    !frames.length ||
    frames.some(
      ({ index, duration }) =>
        !Number.isInteger(index) || index < 0 || index >= frameCount || !Number.isFinite(duration) || duration <= 0,
    )
  ) {
    throw new Error("Invalid animation frames.");
  }
  return frames;
}

/** Which source frame shows `elapsedMs` into a looping schedule. */
export function frameIndexAt(schedule: ScheduledFrame[], elapsedMs: number): number {
  const total = schedule.reduce((sum, frame) => sum + frame.duration, 0);
  let time = Math.max(0, elapsedMs) % total;
  for (const frame of schedule) {
    if (time < frame.duration) return frame.index;
    time -= frame.duration;
  }
  return schedule[schedule.length - 1]!.index;
}

/** Pixel rectangle of frame `index` in the source image. */
export function frameRect(
  index: number,
  grid: { size: FrameSize; columns: number },
): { x: number; y: number; w: number; h: number } {
  return {
    x: (index % grid.columns) * grid.size.w,
    y: Math.floor(index / grid.columns) * grid.size.h,
    w: grid.size.w,
    h: grid.size.h,
  };
}

/**
 * Texture repeat/offset for each moment of the animation, for a texture uploaded with
 * Three's default `flipY = true` (frame zero is at the top of the PNG).
 */
export function createTextureAnimation(imageWidth: number, imageHeight: number, metadata: TextureAnimationMetadata) {
  const grid = frameGrid(imageWidth, imageHeight, metadata.animation);
  const schedule = frameSchedule(metadata.animation, grid.count);
  return (elapsedMs: number) => {
    const index = frameIndexAt(schedule, elapsedMs);
    return {
      repeatX: 1 / grid.columns,
      repeatY: 1 / grid.rows,
      offsetX: (index % grid.columns) / grid.columns,
      offsetY: 1 - (Math.floor(index / grid.columns) + 1) / grid.rows,
    };
  };
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Parse and check `.mcmeta` text; throws with a player-facing message. */
export function parseTextureAnimation(text: string, label = "Animation"): TextureAnimationMetadata {
  const body = text.replace(/^\uFEFF/, "");
  if (!body.trim()) throw new Error(`${label}: .mcmeta file is empty`);
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new Error(`${label}: .mcmeta is not valid JSON`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${label}: .mcmeta must be a JSON object`);
  }
  const keys = Object.keys(raw);
  if (keys.length !== 1 || keys[0] !== "animation") {
    throw new Error(`${label}: .mcmeta must be an object with only an "animation" section`);
  }
  const animation = (raw as Record<string, unknown>).animation;
  if (!animation || typeof animation !== "object" || Array.isArray(animation)) {
    throw new Error(`${label}: .mcmeta needs an "animation" object`);
  }
  const a = animation as Record<string, unknown>;
  const unknown = Object.keys(a)
    .filter((key) => !ANIMATION_KEYS.has(key))
    .sort();
  if (unknown.length) {
    throw new Error(`${label}: .mcmeta animation has unsupported keys: ${unknown.join(", ")}`);
  }
  if (hasNonIntegerNumber(body)) {
    throw new Error(`${label}: .mcmeta numbers must be whole numbers (no decimals)`);
  }
  const out: TextureAnimationMetadata["animation"] = {};
  if (a.frametime !== undefined) {
    if (!isPositiveInt(a.frametime)) throw new Error(`${label}: frametime must be a whole number of ticks, 1 or more`);
    out.frametime = a.frametime;
  }
  for (const key of ["width", "height"] as const) {
    if (a[key] !== undefined) {
      if (!isPositiveInt(a[key])) throw new Error(`${label}: ${key} must be a whole number, 1 or more`);
      out[key] = a[key];
    }
  }
  if (a.interpolate !== undefined) {
    if (typeof a.interpolate !== "boolean") throw new Error(`${label}: interpolate must be true or false`);
    out.interpolate = a.interpolate;
  }
  if (a.frames !== undefined) {
    if (!Array.isArray(a.frames) || a.frames.length === 0) {
      throw new Error(`${label}: frames must be a non-empty list`);
    }
    out.frames = a.frames.map((frame) => {
      if (isIndex(frame)) return frame;
      if (frame && typeof frame === "object" && !Array.isArray(frame)) {
        const f = frame as Record<string, unknown>;
        const extra = Object.keys(f).some((key) => key !== "index" && key !== "time");
        if (!extra && isIndex(f.index) && (f.time === undefined || isPositiveInt(f.time))) {
          return f.time === undefined ? { index: f.index } : { index: f.index, time: f.time };
        }
      }
      throw new Error(`${label}: each frame must be an index or {"index": n, "time": ticks}`);
    });
  }
  return { animation: out };
}

/**
 * Check an animated texture against its `.mcmeta`. With `expected`, every frame must be
 * that size (a fixed 16×16 or 32×32 slot may then hold a grid of frames).
 * Returns the frame count.
 */
export function assertAnimatedTexture(
  image: FrameSize,
  metadata: TextureAnimationMetadata,
  expected: FrameSize | null,
  label: string,
): number {
  let grid: ReturnType<typeof frameGrid>;
  try {
    grid = frameGrid(image.w, image.h, metadata.animation);
  } catch (err) {
    throw new Error(`${label}: ${err instanceof Error ? err.message : "invalid animation"}`);
  }
  if (expected && (grid.size.w !== expected.w || grid.size.h !== expected.h)) {
    throw new Error(
      `${label}: each animation frame must be ${expected.w}×${expected.h}, got ${grid.size.w}×${grid.size.h} frames in a ${image.w}×${image.h} image`,
    );
  }
  try {
    frameSchedule(metadata.animation, grid.count);
  } catch {
    throw new Error(`${label}: animation frames must be between 0 and ${grid.count - 1}`);
  }
  return grid.count;
}

/** Read, size-check and parse an uploaded `.mcmeta` file. */
export async function readTextureAnimationFile(file: File, label = "Animation"): Promise<TextureAnimationMetadata> {
  if (file.size > MCMETA_MAX_BYTES) {
    throw new Error(`${label}: .mcmeta is ${file.size} bytes (limit ${MCMETA_MAX_BYTES} bytes)`);
  }
  return parseTextureAnimation(await file.text(), label);
}

/** True when the viewer asked the OS for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
