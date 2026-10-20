import { describe, expect, it } from "vitest";
import {
  assertAnimatedTexture,
  frameIndexAt,
  frameRect,
  frameGrid,
  frameSchedule,
  frameSizeFor,
  parseTextureAnimation,
} from "./textureAnimation";

describe("Minecraft frame size rules", () => {
  it("uses a square of the shorter side when width and height are unset", () => {
    expect(frameSizeFor(16, 64, {})).toEqual({ w: 16, h: 16 });
    expect(frameSizeFor(64, 16, {})).toEqual({ w: 16, h: 16 });
  });

  it("takes the whole image for the side that is not given", () => {
    expect(frameSizeFor(32, 64, { width: 16 })).toEqual({ w: 16, h: 64 });
    expect(frameSizeFor(32, 64, { height: 16 })).toEqual({ w: 32, h: 16 });
    expect(frameSizeFor(32, 64, { width: 16, height: 32 })).toEqual({
      w: 16,
      h: 32,
    });
  });

  it("reads a grid left to right, then top to bottom", () => {
    const grid = frameGrid(32, 32, { width: 16, height: 16 });
    expect(grid.count).toBe(4);
    expect(frameRect(1, grid)).toEqual({ x: 16, y: 0, w: 16, h: 16 });
    expect(frameRect(2, grid)).toEqual({ x: 0, y: 16, w: 16, h: 16 });
  });
});

describe("animation timing", () => {
  it("loops frames for frametime ticks each", () => {
    const schedule = frameSchedule({ frametime: 2 }, 3);
    expect(schedule.map((f) => f.duration)).toEqual([100, 100, 100]);
    expect(frameIndexAt(schedule, 0)).toBe(0);
    expect(frameIndexAt(schedule, 150)).toBe(1);
    expect(frameIndexAt(schedule, 300)).toBe(0);
  });

  it("honours explicit frames and per-frame times", () => {
    const schedule = frameSchedule({ frames: [2, { index: 0, time: 3 }] }, 3);
    expect(frameIndexAt(schedule, 49)).toBe(2);
    expect(frameIndexAt(schedule, 50)).toBe(0);
    expect(frameIndexAt(schedule, 199)).toBe(0);
  });
});

describe("parseTextureAnimation", () => {
  it("accepts a normal mcmeta", () => {
    expect(parseTextureAnimation('{"animation":{"frametime":4,"interpolate":true}}')).toEqual({
      animation: { frametime: 4, interpolate: true },
    });
  });

  it("rejects bad JSON and bad fields with readable messages", () => {
    expect(() => parseTextureAnimation("{")).toThrow("not valid JSON");
    expect(() => parseTextureAnimation("{}")).toThrow('"animation"');
    expect(() => parseTextureAnimation('{"animation":{"frametime":0}}')).toThrow("frametime");
    expect(() => parseTextureAnimation('{"animation":{"frames":[-1]}}')).toThrow("frame");
    expect(() => parseTextureAnimation('{"animation":{"width":1.5}}')).toThrow("whole numbers");
  });

  it("is as strict as the skins API", () => {
    expect(() => parseTextureAnimation("")).toThrow("empty");
    expect(() => parseTextureAnimation('{"animation":{},"villager":{}}')).toThrow('only an "animation"');
    expect(() => parseTextureAnimation('{"animation":{"speed":2}}')).toThrow("unsupported keys: speed");
    expect(() => parseTextureAnimation('{"animation":{"frames":[{"time":2}]}}')).toThrow("index");
    expect(() => parseTextureAnimation('{"animation":{"frames":[{"index":0,"loop":1}]}}')).toThrow("index");
    expect(() => parseTextureAnimation('{"animation":{"frametime":2.0}}')).toThrow("whole numbers");
    expect(() => parseTextureAnimation('{"animation":{"frames":[1e1]}}')).toThrow("whole numbers");
    expect(parseTextureAnimation('\uFEFF{"animation":{"frames":[0,{"index":1,"time":3}]}}')).toEqual({
      animation: { frames: [0, { index: 1, time: 3 }] },
    });
  });
});

describe("assertAnimatedTexture", () => {
  it("lets a fixed 16×16 slot hold a column of 16×16 frames", () => {
    expect(assertAnimatedTexture({ w: 16, h: 64 }, { animation: {} }, { w: 16, h: 16 }, "Texture")).toBe(4);
  });

  it("rejects frames of the wrong size for a fixed slot", () => {
    expect(() => assertAnimatedTexture({ w: 32, h: 64 }, { animation: {} }, { w: 16, h: 16 }, "Texture")).toThrow(
      "16×16",
    );
  });

  it("rejects images that frames do not divide, and out-of-range frame indices", () => {
    expect(() => assertAnimatedTexture({ w: 16, h: 40 }, { animation: {} }, null, "Texture")).toThrow("evenly");
    expect(() => assertAnimatedTexture({ w: 16, h: 32 }, { animation: { frames: [2] } }, null, "Texture")).toThrow(
      "between 0 and 1",
    );
  });
});
