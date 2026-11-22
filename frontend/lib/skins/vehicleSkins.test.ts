// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_SET_GROUPS, baseSetLabel, kindsForBaseSet } from "./baseSets";
import { firstAllowedKind } from "./kindAccess";
import { ownerAnimationFileNames, ownerFileNames } from "./ownerFiles";
import {
  VEHICLE_SKINS,
  vehicleModelUrl,
  vehicleSpec,
  vehicleTemplateUrl,
  vehicleTextureFields,
  vehicleTextureMap,
} from "./vehicleSkins";
import { assertVehicleTexture } from "./vehicleUpload";

const PUBLIC = join(__dirname, "..", "..", "public");

function pngFile(width: number, height: number): File {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], "t.png", { type: "image/png" });
}

describe("vehicle skins", () => {
  it("lists every vehicle as a Vehicles target whose only style is vehicle", () => {
    expect(VEHICLE_SKINS.length).toBeGreaterThan(0);
    expect(BASE_SET_GROUPS.at(-1)).toEqual({ id: "vehicles", label: "Vehicles" });
    expect(kindsForBaseSet("karve")).toEqual(["vehicle"]);
    expect(baseSetLabel("horse_cart")).toBe("Horse Cart");
    expect(firstAllowedKind({ type: "item", baseSet: "karve" }, ["armor_set", "vehicle"])).toBe("vehicle");
    expect(firstAllowedKind({ type: "item", baseSet: "karve" }, ["handheld"])).toBeNull();
  });

  it("has a preview model and an original for every texture", () => {
    for (const vehicle of VEHICLE_SKINS) {
      expect(existsSync(join(PUBLIC, vehicleModelUrl(vehicle.id)))).toBe(true);
      vehicle.textures.forEach((_, i) =>
        expect(existsSync(join(PUBLIC, vehicleTemplateUrl(vehicle.id, i)))).toBe(true),
      );
    }
  });

  it("maps uploads onto the model's texture keys, falling back to the originals", () => {
    expect(vehicleTextureFields("horse_cart")).toEqual(["texture_0", "texture_1"]);
    const keys = vehicleSpec("horse_cart")!.textures.map((t) => t.key);
    expect(vehicleTextureMap("horse_cart", ["blob:a", null])).toEqual({
      [keys[0]!]: "blob:a",
      [keys[1]!]: vehicleTemplateUrl("horse_cart", 1),
    });
    expect(vehicleTextureMap("zeppelin", [])).toEqual({});
  });

  it("names the owner's stored files like ArmourShop expects", () => {
    const row = { kind: "vehicle", slug: "bob_cart", tiers: [] as string[], base_set: "horse_cart" };
    expect(ownerFileNames(row)).toEqual({ texture_0: "bob_cart_0.png", texture_1: "bob_cart_1.png" });
    expect(ownerAnimationFileNames(row)).toEqual({});
  });

  it("checks each upload against its texture's size", async () => {
    const texture = vehicleSpec("horse_cart")!.textures[1]!;
    await expect(
      assertVehicleTexture(pngFile(texture.width, texture.height), texture, "Texture 2"),
    ).resolves.toBeUndefined();
    await expect(assertVehicleTexture(pngFile(48, 48), texture, "Texture 2")).rejects.toThrow(
      `Texture 2 must be ${texture.width}×${texture.height}, got 48×48`,
    );
  });
});
