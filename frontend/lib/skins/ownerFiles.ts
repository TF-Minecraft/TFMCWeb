import type { SubmissionPublic } from "./api";
import { ARMOR_FIELDS, isModelField, mcmetaField } from "./sizes";

/**
 * The stored files a skin's 3D viewer needs, keyed by the upload form's field names
 * (armour fields are `<tier>_<field>`). Mirrors backend/src/skins/storage.py.
 */
export function ownerFileNames(row: Pick<SubmissionPublic, "kind" | "slug" | "tiers">): Record<string, string> {
  const { kind, slug } = row;
  switch (kind) {
    case "armor_set": {
      const names: Record<string, string> = {};
      for (const tier of row.tiers ?? []) {
        for (const field of ARMOR_FIELDS) names[`${tier}_${field}`] = `${tier}_${field}.png`;
        names[`${tier}_helmet_texture`] = `${tier}_helmet_texture.png`;
        names[`${tier}_helmet_model`] = `${tier}_helmet_model.json`;
      }
      return names;
    }
    case "bow":
    case "large_bow":
      return {
        texture: `${slug}.png`,
        pull_0: `${slug}_0.png`,
        pull_1: `${slug}_1.png`,
        pull_2: `${slug}_2.png`,
      };
    case "crossbow":
      return {
        texture: `${slug}.png`,
        pull_0: `${slug}_0.png`,
        pull_1: `${slug}_1.png`,
        pull_2: `${slug}_2.png`,
        charged: `${slug}_charged.png`,
      };
    case "bow_3d":
    case "crossbow_3d": {
      const names: Record<string, string> = {
        texture: `${slug}.png`,
        model: `${slug}.json`,
        pull_0_model: `${slug}_0.json`,
        pull_1_model: `${slug}_1.json`,
        pull_2_model: `${slug}_2.json`,
      };
      if (kind === "crossbow_3d") names.charged_model = `${slug}_charged.json`;
      return names;
    }
    case "item_3d":
    case "shield":
    case "helmet_3d":
    case "mask":
      return { texture: `${slug}.png`, model: `${slug}.json` };
    case "gun":
      return {
        texture: `${slug}.png`,
        carry_model: `${slug}_carry.json`,
        reload_model: `${slug}_reload.json`,
        aim_model: `${slug}_aim.json`,
      };
    case "book":
      return { unsigned: `${slug}_unsigned.png`, signed: `${slug}_signed.png` };
    default:
      return { texture: `${slug}.png` };
  }
}

/**
 * Optional `.mcmeta` files beside a skin's textures (`<png>.mcmeta`), keyed `<field>_mcmeta`.
 * For armour only the 3D helmet texture is fetched: the showcase draws the worn layers,
 * which never animate, and the helmet model needs its first frame.
 */
export function ownerAnimationFileNames(
  row: Pick<SubmissionPublic, "kind" | "slug" | "tiers">,
): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [field, name] of Object.entries(ownerFileNames(row))) {
    if (isModelField(field) || !name.endsWith(".png")) continue;
    if (row.kind === "armor_set" && !field.endsWith("_helmet_texture")) continue;
    names[mcmetaField(field)] = `${name}.mcmeta`;
  }
  return names;
}
