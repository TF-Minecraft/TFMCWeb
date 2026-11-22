"use client";

import { useEffect, useMemo, useState } from "react";
import WikiModelViewer from "../wiki/WikiModelViewer";
import FileSlot from "./FileSlot";
import { buildPaintKit } from "../../../lib/skins/paintKit";
import type { WikiBlockModel } from "../wiki/modelGeometry";
import {
  vehicleModelUrl,
  vehicleSpec,
  vehicleTemplateUrl,
  vehicleTextureField,
  vehicleTextureMap,
} from "../../../lib/skins/vehicleSkins";

type Props = {
  vehicle: string;
  files: Record<string, File | null>;
  onFile: (field: string, file: File | null) => void;
  disabled?: boolean;
};

type Face = { uv?: number[]; texture?: string };
type PreviewModel = { elements?: { faces?: Record<string, Face> }[] };

const linkClass =
  "inline-flex items-center rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_25%,transparent)] px-2.5 py-1 text-xs text-[var(--tfmc-cream)] transition hover:border-[var(--tfmc-accent)] disabled:opacity-50";

/** Object URLs for the picked textures, revoked when they change. */
function useFileUrls(files: (File | null | undefined)[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const key = files.map((f) => (f ? `${f.name}:${f.size}:${f.lastModified}` : "")).join("|");
  useEffect(() => {
    const next = files.map((file) => (file ? URL.createObjectURL(file) : null));
    setUrls(next);
    return () => next.forEach((url) => url && URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the files
  }, [key]);
  return urls;
}

/**
 * The texture with every face of the model that uses it outlined, four times larger,
 * so a player can see which part of the sheet lands where.
 */
async function fetchModel(vehicle: string): Promise<PreviewModel> {
  const res = await fetch(vehicleModelUrl(vehicle));
  if (!res.ok) throw new Error("Could not load the vehicle model");
  return (await res.json()) as PreviewModel;
}

function save(href: string, name: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read a texture"));
    reader.readAsDataURL(blob);
  });
}

/** A Blockbench project with the vehicle's cubes and original textures, to paint in 3D. */
async function downloadPaintKit(vehicle: string): Promise<void> {
  const spec = vehicleSpec(vehicle);
  if (!spec) return;
  const model = (await fetchModel(vehicle)) as WikiBlockModel;
  const textures = await Promise.all(
    spec.textures.map(async (t, i) => {
      const res = await fetch(vehicleTemplateUrl(vehicle, i));
      if (!res.ok) throw new Error(`Could not load texture ${i + 1}`);
      return { key: t.key, width: t.width, height: t.height, dataUrl: await dataUrl(await res.blob()) };
    }),
  );
  const blob = new Blob([JSON.stringify(buildPaintKit(vehicle, model, textures))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  save(url, `${vehicle}_paint_kit.bbmodel`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function downloadFaceGuide(vehicle: string, index: number): Promise<void> {
  const spec = vehicleSpec(vehicle);
  const texture = spec?.textures[index];
  if (!spec || !texture) return;
  const [model, image] = await Promise.all([
    fetchModel(vehicle),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load the texture"));
      img.src = vehicleTemplateUrl(vehicle, index);
    }),
  ]);
  const scale = Math.max(4, Math.ceil(512 / Math.max(texture.width, texture.height)));
  const canvas = document.createElement("canvas");
  canvas.width = texture.width * scale;
  canvas.height = texture.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255, 64, 160, 0.9)";
  ctx.lineWidth = 1;
  // Preview models keep face UVs on a 0–16 grid per texture.
  const px = canvas.width / 16;
  const py = canvas.height / 16;
  for (const element of model.elements ?? []) {
    for (const face of Object.values(element.faces ?? {})) {
      if (face.texture !== `#${texture.key}` || !face.uv || face.uv.length < 4) continue;
      const [u1, v1, u2, v2] = face.uv as [number, number, number, number];
      const x = Math.min(u1, u2) * px;
      const y = Math.min(v1, v2) * py;
      const w = Math.abs(u2 - u1) * px;
      const h = Math.abs(v2 - v1) * py;
      if (w > 0 && h > 0) ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }
  save(canvas.toDataURL("image/png"), `${vehicle}_${index}_face_guide.png`);
}

/** Vehicle skins: one upload per texture of the vehicle, with its original to paint over. */
export default function VehicleSkinFields({ vehicle, files, onFile, disabled }: Props) {
  const spec = vehicleSpec(vehicle);
  const fields = useMemo(() => (spec?.textures ?? []).map((_, i) => vehicleTextureField(i)), [spec]);
  const picked = fields.map((f) => files[f] ?? null);
  const urls = useFileUrls(picked);
  const textures = useMemo(() => vehicleTextureMap(vehicle, urls), [vehicle, urls]);
  const [guideError, setGuideError] = useState<string | null>(null);

  if (!spec) return <p className="text-sm text-[#e8a0a0]">Unknown vehicle.</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-xs text-[var(--tfmc-mist)]">
        Paint over the {spec.label}&apos;s own textures and keep each one the same size. The shape stays as it is.
        Textures you don&apos;t upload keep their original look.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={linkClass}
          disabled={disabled}
          onClick={() => {
            setGuideError(null);
            downloadPaintKit(vehicle).catch((err: unknown) =>
              setGuideError(err instanceof Error ? err.message : "Could not make the 3D paint file"),
            );
          }}
        >
          3D paint file (Blockbench)
        </button>
        <span className="text-xs text-[var(--tfmc-mist)]">
          Open it in Blockbench (4.9 or newer) and paint on the {spec.label} itself. Then save each texture (right-click
          it, Save As) and upload it in its slot: {vehicle}_0.png goes in Texture 1, {vehicle}_1.png in Texture 2, and
          so on.
        </span>
      </div>
      <WikiModelViewer
        key={vehicle}
        modelUrl={vehicleModelUrl(vehicle)}
        textures={textures}
        label={`${spec.label} with your textures`}
        height="lg"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {spec.textures.map((texture, index) => {
          const field = fields[index]!;
          return (
            <div key={field} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urls[index] || vehicleTemplateUrl(vehicle, index)}
                  alt={`Texture ${index + 1}`}
                  className="h-16 w-16 rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] object-contain [image-rendering:pixelated]"
                />
                <div className="flex flex-wrap gap-2">
                  <a
                    className={linkClass}
                    href={vehicleTemplateUrl(vehicle, index)}
                    download={`${vehicle}_${index}.png`}
                  >
                    Original
                  </a>
                  <button
                    type="button"
                    className={linkClass}
                    disabled={disabled}
                    onClick={() => {
                      setGuideError(null);
                      downloadFaceGuide(vehicle, index).catch((err: unknown) =>
                        setGuideError(err instanceof Error ? err.message : "Could not make the face guide"),
                      );
                    }}
                  >
                    Face guide
                  </button>
                  {files[field] ? (
                    <button type="button" className={linkClass} disabled={disabled} onClick={() => onFile(field, null)}>
                      Use original
                    </button>
                  ) : null}
                </div>
              </div>
              <FileSlot
                label={`Texture ${index + 1}`}
                hint={`${texture.width}×${texture.height} PNG${texture.hidden ? " · not shown on the vehicle, leave as is" : ""}`}
                accept="image/png"
                file={files[field]}
                emptyLabel="Original"
                disabled={disabled}
                onPick={(file) => onFile(field, file)}
              />
            </div>
          );
        })}
      </div>
      {guideError ? <p className="m-0 text-xs text-[#e8a0a0]">{guideError}</p> : null}
    </div>
  );
}
