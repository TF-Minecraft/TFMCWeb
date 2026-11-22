import { readPngSize } from "./sizes";
import type { VehicleTexture } from "./vehicleSkins";

/**
 * Check one vehicle texture upload against its texture's size. Kept apart from vehicleSkins.ts,
 * which baseSets.ts (and through it sizes.ts) imports, so the modules never import each other.
 */
export async function assertVehicleTexture(file: File, texture: VehicleTexture, label: string): Promise<void> {
  const size = await readPngSize(file);
  if (size.w !== texture.width || size.h !== texture.height) {
    throw new Error(`${label} must be ${texture.width}×${texture.height}, got ${size.w}×${size.h}`);
  }
}
