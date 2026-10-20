import { createTextureAnimation } from "../../../lib/textureAnimation";

export type { TextureAnimationMetadata } from "../../../lib/textureAnimation";

/** Minecraft animation times are game ticks (50 ms), not browser frames. */
export const createStationTextureAnimation = createTextureAnimation;

/** Keep an atlas on its first frame when optional animation metadata is unavailable. */
export function createStationTextureAtlasFallback(
  imageWidth: number,
  imageHeight: number,
  textureSize: [number, number],
) {
  const [frameWidth, frameHeight] = textureSize;
  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    imageWidth !== frameWidth ||
    imageHeight <= frameHeight ||
    imageHeight % frameHeight !== 0
  ) {
    return undefined;
  }

  const rows = imageHeight / frameHeight;
  return () => ({
    repeatX: 1,
    repeatY: 1 / rows,
    offsetX: 0,
    offsetY: 1 - 1 / rows,
  });
}
