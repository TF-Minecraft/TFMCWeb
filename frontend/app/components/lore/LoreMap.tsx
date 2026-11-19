"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import MapViewport from "../map/MapViewport";
import TileLayer from "../map/TileLayer";
import { mapFallbackSize, type MapId } from "../map/types";
import { tileUrl, useTileManifest } from "../../hooks/useTileManifest";
import { useMapViewport } from "../../hooks/useMapViewport";
import { mapApiUrl } from "@/lib/map/api";
import type { LocationKind } from "@/lib/lore/api";
import { KIND_MARK } from "@/lib/lore/locations";

export type MapPoint = { x: number; z: number };
export type MapMarker = MapPoint & { id: number; name: string; kind: LocationKind };

/** How close the map zooms: screen pixels per block. */
const MAX_PIXELS_PER_BLOCK = 12;
/** The box framed around one location, in blocks. */
const FOCUS_FRAME = 240;
const FOCUS_INSET = { left: 24, right: 24, top: 24, bottom: 24 };
/** From this many screen pixels per block, every marker is named; below it only the selected one. */
const NAMES_FROM_SCALE = 0.6;

const controlClass =
  "h-11 w-11 rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_25%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_85%,transparent)] text-lg text-[var(--tfmc-cream)] hover:border-[var(--tfmc-accent)]";

/**
 * The lore map: the site's base tiles with a marker per location (block X/Z are map
 * pixels). While `adding`, a click on the map reports the block under it through
 * `onPlace`. A change of `focus.key` frames that point.
 */
export default function LoreMap({
  mapId,
  markers,
  selectedId,
  pin,
  adding,
  focus,
  onSelect,
  onPlace,
  className = "",
}: {
  mapId: MapId;
  markers: MapMarker[];
  selectedId: number | null;
  pin: MapPoint | null;
  adding: boolean;
  focus: (MapPoint & { key: string }) | null;
  onSelect: (id: number) => void;
  onPlace: (point: MapPoint) => void;
  className?: string;
}) {
  const tiles = useTileManifest(mapId, "base", true);
  const [mapSize, setMapSize] = useState({ w: mapFallbackSize(mapId), h: mapFallbackSize(mapId) });
  const manifest = tiles.manifest;
  useEffect(() => {
    if (manifest) setMapSize({ w: manifest.width, h: manifest.height });
  }, [manifest]);

  const viewport = useMapViewport({
    mapSize,
    fitMode: "contain",
    dragPan: true,
    keyboard: false,
    restingZoom: true,
    maxDisplayScale: MAX_PIXELS_PER_BLOCK,
  });
  const { displayScale, focusMapRect, resetViewport, zoomBy, consumeDragClick, screenToMapFromClient } = viewport;
  const ready = viewport.viewportSize.w > 0;

  const tileView = useMemo(
    () => ({
      displayScale: viewport.displayScale,
      translateX: viewport.translateX,
      translateY: viewport.translateY,
      viewportW: viewport.viewportSize.w,
      viewportH: viewport.viewportSize.h,
    }),
    [viewport.displayScale, viewport.translateX, viewport.translateY, viewport.viewportSize.w, viewport.viewportSize.h],
  );

  const focusPoint = (x: number, z: number, animated = true) =>
    focusMapRect(
      { x: x - FOCUS_FRAME / 2, y: z - FOCUS_FRAME / 2, w: FOCUS_FRAME, h: FOCUS_FRAME },
      FOCUS_INSET,
      undefined,
      { animated },
    );

  // Frame each new focus once. The first one jumps there: animated from the whole
  // map, tiles loaded mid-zoom stayed blurry.
  const focusedRef = useRef<string | null>(null);
  const movedRef = useRef(false);
  useEffect(() => {
    if (!ready || !focus || focusedRef.current === focus.key) return;
    focusedRef.current = focus.key;
    focusPoint(focus.x, focus.z, movedRef.current);
    movedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key, ready]);

  const unit = displayScale > 0 ? 1 / displayScale : 1;
  const named = displayScale >= NAMES_FROM_SCALE;
  const halo = { stroke: "#10160f", strokeWidth: 3 * unit, paintOrder: "stroke" as const };
  // The selected marker draws last, on top of its neighbours.
  const ordered = useMemo(
    () => [...markers].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)),
    [markers, selectedId],
  );
  const selected = markers.find((m) => m.id === selectedId) ?? null;

  const controls = [
    { label: "+", title: "Zoom in", run: () => zoomBy(1.6) },
    { label: "−", title: "Zoom out", run: () => zoomBy(1 / 1.6) },
    { label: "⤢", title: "Show the whole map", run: () => resetViewport({ animated: true }) },
    ...(selected
      ? [{ label: "◎", title: "Go to the selected location", run: () => focusPoint(selected.x, selected.z) }]
      : []),
    ...(pin ? [{ label: "⌖", title: "Go to the new pin", run: () => focusPoint(pin.x, pin.z) }] : []),
  ];

  return (
    <div
      className={`relative overflow-hidden bg-[var(--tfmc-forest-deep)] ${
        adding ? "[&>div:first-child]:!cursor-crosshair" : ""
      } ${className}`}
      onClick={(event) => {
        // Always take the drag flag here, so a pan that ended on bare map can't eat the next marker click.
        if (consumeDragClick() || !adding) return;
        const point = screenToMapFromClient(event.clientX, event.clientY);
        if (point) onPlace({ x: Math.floor(point.x), z: Math.floor(point.y) });
      }}
    >
      <MapViewport
        mapSize={mapSize}
        viewportRef={viewport.viewportRef}
        contentRef={viewport.contentRef}
        transformStyle={viewport.transformStyle}
        transformTransition={viewport.transformTransition}
        zoom={viewport.zoom}
        cursorClassName={viewport.cursorClassName}
        isPanning={viewport.isPanning}
        fill
        capturesTouch
      >
        {manifest ? (
          <TileLayer
            manifest={manifest}
            onTileError={tiles.refresh}
            tileUrl={(level, x, y) => tileUrl(mapId, "base", manifest, level, x, y)}
            view={tileView}
            className={displayScale >= 1 ? "[image-rendering:pixelated]" : ""}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mapApiUrl(`/${mapId}/map/preview`)}
            alt="Map preview"
            className="pointer-events-none block h-full w-full"
          />
        )}
        <svg
          className="pointer-events-none absolute left-0 top-0 z-[13] h-full w-full"
          viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {ordered.map((marker) => {
            const mark = KIND_MARK[marker.kind] ?? KIND_MARK.other;
            const isSelected = marker.id === selectedId;
            const cx = marker.x + 0.5;
            const cy = marker.z + 0.5;
            const r = (isSelected ? 11 : 8) * unit;
            return (
              <g
                key={marker.id}
                className={adding ? "" : "pointer-events-auto cursor-pointer"}
                onClick={(event) => {
                  if (adding) return;
                  event.stopPropagation();
                  if (!consumeDragClick()) onSelect(marker.id);
                }}
              >
                <title>{`${marker.name} (${mark.label})\n${marker.x}, ${marker.z}`}</title>
                {isSelected ? (
                  <circle cx={cx} cy={cy} r={r + 5 * unit} fill="none" stroke="#fff" strokeWidth={2 * unit} />
                ) : null}
                <circle cx={cx} cy={cy} r={r} fill={mark.colour} stroke="#10160f" strokeWidth={2 * unit} />
                <text
                  x={cx}
                  y={cy}
                  fontSize={(isSelected ? 13 : 10) * unit}
                  fontWeight={700}
                  fill="#10160f"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {mark.glyph}
                </text>
                {named || isSelected ? (
                  <text
                    x={cx + r + 4 * unit}
                    y={cy}
                    fontSize={12 * unit}
                    fontWeight={600}
                    fill="#fff"
                    dominantBaseline="central"
                    {...halo}
                  >
                    {marker.name}
                  </text>
                ) : null}
              </g>
            );
          })}
          {pin ? (
            <g>
              <circle
                cx={pin.x + 0.5}
                cy={pin.z + 0.5}
                r={9 * unit}
                fill="none"
                stroke="#f4c96b"
                strokeWidth={2.5 * unit}
              />
              <path
                d={`M ${pin.x + 0.5 - 14 * unit} ${pin.z + 0.5} H ${pin.x + 0.5 + 14 * unit} M ${pin.x + 0.5} ${
                  pin.z + 0.5 - 14 * unit
                } V ${pin.z + 0.5 + 14 * unit}`}
                stroke="#fff"
                strokeWidth={1.5 * unit}
              />
              <text
                x={pin.x + 0.5}
                y={pin.z + 0.5 + 16 * unit}
                fontSize={12 * unit}
                fontWeight={600}
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="hanging"
                {...halo}
              >
                New location
              </text>
            </g>
          ) : null}
        </svg>
      </MapViewport>
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1">
        {controls.map((button) => (
          <button
            key={button.title}
            type="button"
            title={button.title}
            aria-label={button.title}
            onClick={(event) => {
              event.stopPropagation();
              button.run();
            }}
            className={controlClass}
          >
            {button.label}
          </button>
        ))}
      </div>
      {adding ? (
        <p className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-sm bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_88%,transparent)] px-3 py-1.5 text-sm text-[var(--tfmc-cream)]">
          Click the map to place the new location
        </p>
      ) : null}
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-3 gap-y-1 rounded-sm bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_82%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--tfmc-cream)]">
        {Object.entries(KIND_MARK).map(([kind, mark]) => (
          <span key={kind} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-[#10160f]"
              style={{ background: mark.colour }}
            >
              {mark.glyph}
            </span>
            {mark.label}
          </span>
        ))}
      </div>
    </div>
  );
}
