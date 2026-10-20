import { assertAnimatedTexture, readTextureAnimationFile } from "../textureAnimation";
import { RANGED_3D_TOTAL_BYTES } from "./baseSets";

export type SkinKind =
  | "armor_set"
  | "handheld"
  | "large_handheld"
  | "bow"
  | "large_bow"
  | "crossbow"
  | "bow_3d"
  | "crossbow_3d"
  | "item_3d"
  | "shield"
  | "helmet_3d"
  | "mask"
  | "gun"
  | "book";

export type Size = { w: number; h: number };

export const ICON_SIZE: Size = { w: 16, h: 16 };
export const LAYER_SIZE: Size = { w: 64, h: 32 };
export const ITEM_SIZE: Size = { w: 16, h: 16 };
export const LARGE_SIZE: Size = { w: 32, h: 32 };

export const ARMOR_ICON_FIELDS = ["helmet", "chestplate", "leggings", "boots"] as const;

export const ARMOR_LAYER_FIELDS = ["layer_1", "layer_2"] as const;

export const ARMOR_FIELDS = [...ARMOR_ICON_FIELDS, ...ARMOR_LAYER_FIELDS] as const;

/** Armor body fields always required (helmet handled separately). */
export const ARMOR_BODY_FIELDS = ["chestplate", "leggings", "boots", ...ARMOR_LAYER_FIELDS] as const;

export const BOW_PULL_FIELDS = ["pull_0", "pull_1", "pull_2"] as const;
export const BOW_FRAME_FIELDS = ["texture", ...BOW_PULL_FIELDS] as const;
export const CROSSBOW_FRAME_FIELDS = [...BOW_FRAME_FIELDS, "charged"] as const;

export const MODEL_3D_FIELDS = ["texture", "model"] as const;
/** 3D bow: one texture, a model for standby and each pull stage. */
export const BOW_3D_FIELDS = ["texture", "model", "pull_0_model", "pull_1_model", "pull_2_model"] as const;
export const CROSSBOW_3D_FIELDS = [...BOW_3D_FIELDS, "charged_model"] as const;
export const GUN_FIELDS = ["texture", "carry_model", "reload_model", "aim_model"] as const;
export const BOOK_FIELDS = ["unsigned", "signed"] as const;

export function isLargeTextureKind(kind: SkinKind): boolean {
  return kind === "large_handheld" || kind === "large_bow";
}

export function isBowFrameKind(kind: SkinKind): boolean {
  return kind === "bow" || kind === "large_bow" || kind === "crossbow";
}

export function isModel3dKind(kind: SkinKind): boolean {
  return kind === "item_3d" || kind === "shield" || kind === "helmet_3d" || kind === "mask";
}

/** 3D bow / crossbow: a model per draw stage sharing one texture. */
export function isRanged3dKind(kind: SkinKind | string | undefined): boolean {
  return kind === "bow_3d" || kind === "crossbow_3d";
}

export function isGunKind(kind: SkinKind): boolean {
  return kind === "gun";
}

export function isBookKind(kind: SkinKind): boolean {
  return kind === "book";
}

export function fileFieldsForKind(kind: SkinKind): readonly string[] {
  if (kind === "armor_set") {
    return ARMOR_FIELDS;
  }
  if (kind === "bow" || kind === "large_bow") {
    return BOW_FRAME_FIELDS;
  }
  if (kind === "crossbow") {
    return CROSSBOW_FRAME_FIELDS;
  }
  if (isModel3dKind(kind)) {
    return MODEL_3D_FIELDS;
  }
  if (kind === "bow_3d") {
    return BOW_3D_FIELDS;
  }
  if (kind === "crossbow_3d") {
    return CROSSBOW_3D_FIELDS;
  }
  if (isGunKind(kind)) {
    return GUN_FIELDS;
  }
  if (isBookKind(kind)) {
    return BOOK_FIELDS;
  }
  return ["texture"];
}

export function expectedSizeForField(kind: SkinKind, field: string): Size | null {
  if (kind === "armor_set") {
    if (field === "helmet_texture") {
      return null; // any PNG size for 3D helmet texture
    }
    if ((ARMOR_ICON_FIELDS as readonly string[]).includes(field)) {
      return ICON_SIZE;
    }
    if ((ARMOR_LAYER_FIELDS as readonly string[]).includes(field)) {
      return LAYER_SIZE;
    }
    return null;
  }
  if (isBookKind(kind)) {
    if ((BOOK_FIELDS as readonly string[]).includes(field)) {
      return ITEM_SIZE;
    }
    return null;
  }
  if (isModel3dKind(kind) || isGunKind(kind) || isRanged3dKind(kind)) {
    return null;
  }
  if (isBowFrameKind(kind)) {
    if (field === "texture" || field.startsWith("pull_") || field === "charged") {
      return isLargeTextureKind(kind) ? LARGE_SIZE : ITEM_SIZE;
    }
    return null;
  }
  if (field === "texture") {
    return isLargeTextureKind(kind) ? LARGE_SIZE : ITEM_SIZE;
  }
  return null;
}

/** Read PNG IHDR width/height from a File. */
export function readPngSize(file: File): Promise<Size> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      if (!(buf instanceof ArrayBuffer) || buf.byteLength < 24) {
        reject(new Error(`${file.name}: not a valid PNG`));
        return;
      }
      const bytes = new Uint8Array(buf);
      const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < 8; i++) {
        if (bytes[i] !== magic[i]) {
          reject(new Error(`${file.name}: not a PNG`));
          return;
        }
      }
      const view = new DataView(buf);
      const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
      if (type !== "IHDR") {
        reject(new Error(`${file.name}: missing IHDR`));
        return;
      }
      resolve({ w: view.getUint32(16), h: view.getUint32(20) });
    };
    reader.onerror = () => reject(new Error(`${file.name}: could not read file`));
    reader.readAsArrayBuffer(file.slice(0, 24));
  });
}

export async function assertFileSize(file: File, expected: Size, label: string): Promise<void> {
  const size = await readPngSize(file);
  if (size.w !== expected.w || size.h !== expected.h) {
    throw new Error(`${label} must be ${expected.w}×${expected.h}, got ${size.w}×${size.h}`);
  }
}

/** A texture's optional `.mcmeta` counts toward its pair (as backend size_limits.py). */
function assertPairBytes(
  texture: File | undefined,
  model: File | undefined,
  maxBytes: number,
  label: string,
  mcmeta?: File,
): void {
  const total = (texture?.size ?? 0) + (model?.size ?? 0) + (mcmeta?.size ?? 0);
  const cap = Math.max(0, Math.floor(maxBytes));
  if (total > cap) {
    throw new Error(`${label}: texture + model is ${total} bytes (limit ${cap} bytes)`);
  }
}

/**
 * Client check for ArmourShop max-3d-pair-bytes (mirror of BE size_limits).
 */
export function assert3dPairBudgets(
  kind: SkinKind,
  files: Record<string, File>,
  maxBytes: number,
  helmet3dTiers?: string[],
): void {
  const needsBudget =
    isModel3dKind(kind) || isGunKind(kind) || (kind === "armor_set" && Boolean(helmet3dTiers?.length));
  if (!needsBudget) {
    return;
  }

  const cap = Math.max(0, Math.floor(maxBytes));
  if (cap <= 0) {
    throw new Error("3D size limit unavailable - wait for catalog sync");
  }

  if (isModel3dKind(kind)) {
    assertPairBytes(files.texture, files.model, cap, kind, files.texture_mcmeta);
    return;
  }

  if (isGunKind(kind)) {
    for (const stem of ["carry_model", "reload_model", "aim_model"] as const) {
      assertPairBytes(files.texture, files[stem], cap, `gun/${stem}`, files.texture_mcmeta);
    }
    return;
  }

  if (kind === "armor_set" && helmet3dTiers?.length) {
    for (const tier of helmet3dTiers) {
      const t = (tier || "").trim();
      if (!t) continue;
      assertPairBytes(
        files[`${t}_helmet_texture`],
        files[`${t}_helmet_model`],
        cap,
        `armor_set/${t}_helmet`,
        files[`${t}_helmet_texture_mcmeta`],
      );
    }
  }
}

/** Hint text when a pair budget is known from catalog/session. */
export function pairBudgetHint(maxBytes: number | undefined): string {
  if (!maxBytes || maxBytes <= 0) return "";
  // Round down so the hint never overstates the limit.
  const kb = Math.floor((maxBytes / 1024) * 10) / 10;
  if (kb < 1) return `Model + texture (and its .mcmeta): max ${maxBytes} bytes`;
  return `Model + texture (and its .mcmeta): max ${kb >= 10 ? Math.floor(kb) : kb} KB`;
}

/** Upload fields that take a model JSON rather than a PNG. */
export function isModelField(field: string): boolean {
  return field === "model" || field.endsWith("_model");
}

/** Optional `.mcmeta` upload field for a PNG field (`texture` → `texture_mcmeta`). */
export function mcmetaField(field: string): string {
  return `${field}_mcmeta`;
}

/** Every PNG may be animated except the worn armour layers. */
export function mcmetaAllowed(field: string): boolean {
  if (isModelField(field)) return false;
  return !(ARMOR_LAYER_FIELDS as readonly string[]).includes(field);
}

/**
 * Check one PNG slot. Without `.mcmeta` a fixed slot must be exactly `expected`; with one,
 * each frame must be `expected` (any size for free-size 3D textures).
 */
export async function assertTextureFile(
  file: File,
  expected: Size | null,
  mcmeta: File | null | undefined,
  label: string,
): Promise<void> {
  if (!mcmeta) {
    if (expected) await assertFileSize(file, expected, label);
    return;
  }
  const metadata = await readTextureAnimationFile(mcmeta, `${label} animation`);
  const size = await readPngSize(file);
  assertAnimatedTexture(size, metadata, expected, label);
}

/** Sum of every uploaded file for a 3D bow / crossbow (models, texture and `.mcmeta`). */
export function ranged3dTotalBytes(files: Record<string, File | null | undefined>): number {
  return Object.values(files).reduce((sum, file) => sum + (file?.size ?? 0), 0);
}

/** 3D bows and crossbows share one fixed cap for all their files, the same for every rank. */
export function assertRanged3dBudget(
  kind: SkinKind,
  files: Record<string, File | null | undefined>,
  maxBytes: number = RANGED_3D_TOTAL_BYTES,
): void {
  if (!isRanged3dKind(kind)) return;
  const total = ranged3dTotalBytes(files);
  if (total > maxBytes) {
    throw new Error(
      `All files together are ${formatBytes(total)} (${total} bytes); the limit for a 3D ${
        kind === "crossbow_3d" ? "crossbow" : "bow"
      } is ${formatBytes(maxBytes)} (${maxBytes} bytes)`,
    );
  }
}

/** "60 KB" style size, rounded down to one decimal under 10 KB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  const kb = Math.floor((bytes / 1024) * 10) / 10;
  return `${kb >= 10 ? Math.floor(kb) : kb} KB`;
}
