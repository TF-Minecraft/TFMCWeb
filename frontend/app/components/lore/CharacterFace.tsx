"use client";

import { useState } from "react";

import { faceUrl } from "@/lib/lore/api";

/**
 * A character's face (from an uploaded skin or a linked player), or the first letter
 * of their name when there is none or it fails to load. `cacheKey` busts the browser
 * cache when the face changes; the record's `updated_at` does that.
 */
export default function CharacterFace({
  id,
  name,
  hasFace,
  cacheKey,
  size = 40,
}: {
  id: number;
  name: string;
  hasFace: boolean;
  cacheKey?: string;
  size?: number;
}) {
  const src = hasFace ? faceUrl(id, cacheKey) : null;
  const [failed, setFailed] = useState<string | null>(null);
  const style = { width: size, height: size };
  if (src && failed !== src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-sm [image-rendering:pixelated]"
        onError={() => setFailed(src)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.45) }}
      className="inline-flex shrink-0 items-center justify-center rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_60%,transparent)] font-[family-name:var(--font-fraunces)] text-[var(--tfmc-mist)]"
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
