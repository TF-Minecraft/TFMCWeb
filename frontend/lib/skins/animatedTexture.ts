import {
  frameGrid,
  frameRect,
  frameSchedule,
  readTextureAnimationFile,
  type ScheduledFrame,
} from "../textureAnimation";

/** An animated PNG cut into one canvas per source frame, plus its play order. */
export type AnimatedFrames = {
  frames: HTMLCanvasElement[];
  schedule: ScheduledFrame[];
};

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load texture PNG"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Cut `texture` into its animation frames using `mcmeta`. Frames are separate canvases,
 * so a preview can swap whole images instead of shifting UVs (flat items need a
 * separate mesh per frame because the outline can change).
 */
export async function loadAnimatedFrames(texture: File, mcmeta: File): Promise<AnimatedFrames> {
  const metadata = await readTextureAnimationFile(mcmeta);
  const image = await loadImage(texture);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const grid = frameGrid(width, height, metadata.animation);
  const schedule = frameSchedule(metadata.animation, grid.count);
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < grid.count; i++) {
    const rect = frameRect(i, grid);
    const canvas = document.createElement("canvas");
    canvas.width = rect.w;
    canvas.height = rect.h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not read texture PNG");
    ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    frames.push(canvas);
  }
  return { frames, schedule };
}

export function canvasImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read texture canvas");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
