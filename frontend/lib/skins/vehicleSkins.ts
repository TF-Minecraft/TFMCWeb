import catalog from "../../../shared/skins/vehicle_skins.json";

/**
 * Vehicles players can repaint, from shared/skins/vehicle_skins.json (the backend reads the
 * same file). Generated from Main's vehicle models by scripts/build-vehicle-skin-templates.mjs.
 * A vehicle skin replaces every texture of the vehicle and keeps its shape, so each texture is
 * uploaded at its exact size, in model order, as `texture_0` … `texture_{n-1}`.
 */

export type VehicleTexture = {
  key: string;
  width: number;
  height: number;
  sha256: string;
  /** No visible face of the vehicle uses it (only hidden parts do). */
  hidden?: boolean;
};

export type VehicleSkinSpec = { id: string; label: string; textures: readonly VehicleTexture[] };

export const VEHICLE_SKINS: readonly VehicleSkinSpec[] = catalog.vehicles;

export const VEHICLE_GROUP = { id: "vehicles", label: "Vehicles" } as const;

export function vehicleSpec(id: string | null | undefined): VehicleSkinSpec | undefined {
  return VEHICLE_SKINS.find((v) => v.id === id);
}

export function vehicleTextureField(index: number): string {
  return `texture_${index}`;
}

export function vehicleTextureFields(id: string): string[] {
  return (vehicleSpec(id)?.textures ?? []).map((_, i) => vehicleTextureField(i));
}

/** The vehicle's own texture: the template a player paints over. */
export function vehicleTemplateUrl(id: string, index: number): string {
  return `/skins/vehicles/${id}/${index}.png`;
}

/** Preview model (same block-model format as the wiki's vehicle models). */
export function vehicleModelUrl(id: string): string {
  return `/skins/vehicles/${id}.json`;
}

/** Stored file name of texture `index`, as the backend writes it and ArmourShop reads it. */
export function vehicleStoredName(slug: string, index: number): string {
  return `${slug}_${index}.png`;
}

/** Texture key (the model's `#key`) → URL, for the vehicle preview. */
export function vehicleTextureMap(id: string, urls: readonly (string | null | undefined)[]): Record<string, string> {
  const spec = vehicleSpec(id);
  if (!spec) return {};
  return Object.fromEntries(spec.textures.map((t, i) => [t.key, urls[i] || vehicleTemplateUrl(id, i)]));
}
