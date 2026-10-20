import { describe, expect, it } from "vitest";
import {
  assert3dPairBudgets,
  assertRanged3dBudget,
  expectedSizeForField,
  fileFieldsForKind,
  formatBytes,
  mcmetaAllowed,
  mcmetaField,
  pairBudgetHint,
} from "./sizes";

function fakeFile(bytes: number, name = "f"): File {
  return new File([new Uint8Array(bytes)], name);
}

describe("pairBudgetHint", () => {
  it("is empty without a budget", () => {
    expect(pairBudgetHint(undefined)).toBe("");
    expect(pairBudgetHint(0)).toBe("");
  });

  it("shows whole kilobytes, rounded down", () => {
    expect(pairBudgetHint(262_144)).toBe("Model + texture (and its .mcmeta): max 256 KB");
    expect(pairBudgetHint(20_000)).toBe("Model + texture (and its .mcmeta): max 19 KB");
  });

  it("keeps one decimal under 10 KB and bytes under 1 KB", () => {
    expect(pairBudgetHint(5_000)).toBe("Model + texture (and its .mcmeta): max 4.8 KB");
    expect(pairBudgetHint(800)).toBe("Model + texture (and its .mcmeta): max 800 bytes");
  });
});

describe("3D bow and crossbow fields", () => {
  it("asks for one texture and a model per draw stage", () => {
    expect(fileFieldsForKind("bow_3d")).toEqual(["texture", "model", "pull_0_model", "pull_1_model", "pull_2_model"]);
    expect(fileFieldsForKind("crossbow_3d")).toEqual([
      "texture",
      "model",
      "pull_0_model",
      "pull_1_model",
      "pull_2_model",
      "charged_model",
    ]);
    expect(expectedSizeForField("bow_3d", "texture")).toBeNull();
  });

  it("caps every file together at 60 KB, for any rank", () => {
    const files = {
      texture: fakeFile(20_000),
      model: fakeFile(20_000),
      texture_mcmeta: fakeFile(1_000),
    };
    expect(() => assertRanged3dBudget("bow_3d", files)).not.toThrow();
    expect(() =>
      assertRanged3dBudget("bow_3d", {
        ...files,
        pull_0_model: fakeFile(21_000),
      }),
    ).toThrow("60 KB");
    // Other kinds are not limited here.
    expect(() => assertRanged3dBudget("item_3d", { model: fakeFile(100_000) })).not.toThrow();
  });

  it("formats sizes like the hints", () => {
    expect(formatBytes(61_440)).toBe("60 KB");
    expect(formatBytes(900)).toBe("900 bytes");
  });
});

describe("animation slots", () => {
  it("allows .mcmeta on textures but not on models or armour layers", () => {
    expect(mcmetaAllowed("texture")).toBe(true);
    expect(mcmetaAllowed("pull_1")).toBe(true);
    expect(mcmetaAllowed("helmet_texture")).toBe(true);
    expect(mcmetaAllowed("model")).toBe(false);
    expect(mcmetaAllowed("pull_0_model")).toBe(false);
    expect(mcmetaAllowed("layer_1")).toBe(false);
    expect(mcmetaField("unsigned")).toBe("unsigned_mcmeta");
  });
});

describe("3D pair budgets", () => {
  it("counts the texture's .mcmeta toward its pair", () => {
    const pair = { texture: fakeFile(500), model: fakeFile(400) };
    expect(() => assert3dPairBudgets("item_3d", pair, 1000)).not.toThrow();
    expect(() => assert3dPairBudgets("item_3d", { ...pair, texture_mcmeta: fakeFile(200) }, 1000)).toThrow("1100");
    expect(() =>
      assert3dPairBudgets(
        "gun",
        { texture: fakeFile(500), carry_model: fakeFile(400), texture_mcmeta: fakeFile(200) },
        1000,
      ),
    ).toThrow("gun/carry_model");
    expect(() =>
      assert3dPairBudgets(
        "armor_set",
        {
          light_iron_helmet_texture: fakeFile(500),
          light_iron_helmet_model: fakeFile(400),
          light_iron_helmet_texture_mcmeta: fakeFile(200),
        },
        1000,
        ["light_iron"],
      ),
    ).toThrow("light_iron_helmet");
  });
});
