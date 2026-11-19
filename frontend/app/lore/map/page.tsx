"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import LoadingSkeleton from "@/app/components/shared/LoadingSkeleton";
import { listEntities, loreErrorMessage, type LocationDetail, type LocationRow } from "@/lib/lore/api";
import { filterLocations, KIND_MARK, MAP_WORLD } from "@/lib/lore/locations";
import MapWorkspace, { mapFrameClass, MapWorkspaceSkeleton } from "../../components/admin/MapWorkspace";
import { useLiveMapId } from "../../components/admin/MovementControls";
import {
  buttonClass,
  errorClass,
  headingClass,
  inputClass,
  mutedClass,
  quietButtonClass,
} from "../../components/admin/ui";
import LocationPanel, { NewLocationForm } from "../../components/lore/LocationPanel";
import LoreMap, { type MapMarker, type MapPoint } from "../../components/lore/LoreMap";

export default function LoreMapPage() {
  // The selected location lives in the URL's query, which needs a Suspense boundary.
  return (
    <Suspense fallback={<MapWorkspaceSkeleton />}>
      <LoreMapWorkspace />
    </Suspense>
  );
}

function idParam(raw: string | null): number | null {
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}

type Focus = MapPoint & { key: string };

function LoreMapWorkspace() {
  const router = useRouter();
  const search = useSearchParams();
  const selectedId = idParam(search.get("location"));
  const mapId = useLiveMapId();

  const [rows, setRows] = useState<LocationRow[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [pin, setPin] = useState<MapPoint | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const focusCount = useRef(0);

  // Only the newest list request may land, so a slow older one can't undo a newer result.
  const loads = useRef(0);
  const load = useCallback(async () => {
    const request = ++loads.current;
    try {
      const next = await listEntities("location");
      if (request !== loads.current) return;
      setRows(next);
      setLoadError("");
    } catch (err) {
      if (request === loads.current) setLoadError(loreErrorMessage(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const centre = useCallback((point: MapPoint) => {
    focusCount.current += 1;
    setFocus({ x: point.x, z: point.z, key: String(focusCount.current) });
  }, []);

  // A location chosen by the URL (a link, back or forward) is centred once the list has it.
  // Picks made on this page set `handled` first, so a marker click doesn't move the map.
  const handled = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!rows || handled.current === selectedId) return;
    handled.current = selectedId;
    const row = rows.find((r) => r.id === selectedId);
    if (row && row.world === MAP_WORLD) centre(row);
  }, [rows, selectedId, centre]);

  const select = useCallback(
    (id: number | null, options: { centre?: boolean } = {}) => {
      handled.current = id;
      router.replace(id === null ? "/lore/map" : `/lore/map?location=${id}`, { scroll: false });
      const row = rows?.find((r) => r.id === id);
      if (options.centre && row && row.world === MAP_WORLD) centre(row);
    },
    [router, rows, centre],
  );

  function startAdding() {
    setAdding(true);
    setPin(null);
    select(null);
  }

  function stopAdding() {
    setAdding(false);
    setPin(null);
  }

  function created(detail: LocationDetail) {
    stopAdding();
    // Select and centre it now; the list refresh only adds it to the list and markers.
    handled.current = detail.id;
    router.replace(`/lore/map?location=${detail.id}`, { scroll: false });
    if (detail.world === MAP_WORLD) centre(detail);
    void load();
  }

  const markers = useMemo<MapMarker[]>(
    () =>
      (rows ?? [])
        .filter((r) => r.world === MAP_WORLD)
        .map((r) => ({ id: r.id, name: r.name, kind: r.kind, x: r.x, z: r.z })),
    [rows],
  );
  const shown = useMemo(() => filterLocations(rows ?? [], query), [rows, query]);

  const panel = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={headingClass}>Locations</h2>
        <span className={mutedClass}>{rows ? `${rows.length}` : ""}</span>
      </div>
      {adding ? (
        <button type="button" className={quietButtonClass} onClick={stopAdding}>
          Stop adding
        </button>
      ) : (
        <button type="button" className={buttonClass} onClick={startAdding}>
          Add location
        </button>
      )}
      <input
        type="search"
        className={inputClass}
        value={query}
        maxLength={120}
        placeholder="Search locations…"
        aria-label="Search locations"
        onChange={(e) => setQuery(e.target.value)}
      />
      {/* A failed refresh keeps the rows already shown. */}
      {loadError ? (
        <p className={errorClass} role="alert">
          {loadError}
        </p>
      ) : null}
      {!rows ? (
        loadError ? null : (
          <p className={mutedClass}>Loading…</p>
        )
      ) : shown.length === 0 ? (
        <p className={mutedClass}>{rows.length ? "No locations match." : "No locations yet. Add the first one."}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {shown.map((row) => {
            const mark = KIND_MARK[row.kind] ?? KIND_MARK.other;
            const isSelected = row.id === selectedId;
            const onMap = row.world === MAP_WORLD;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => {
                    stopAdding();
                    select(row.id, { centre: true });
                  }}
                  className={`flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_8%,transparent)] ${
                    isSelected ? "bg-[color-mix(in_srgb,var(--tfmc-accent)_18%,transparent)]" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#10160f]"
                    style={{ background: mark.colour }}
                  >
                    {mark.glyph}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--tfmc-cream)]">{row.name}</span>
                    <span className="block text-xs text-[var(--tfmc-stone)]">
                      {mark.label} · {row.x}, {row.z}
                      {onMap ? "" : ` · ${row.world}, not on this map`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  let inspector: React.ReactNode;
  if (adding) inspector = <NewLocationForm pin={pin} onMove={setPin} onCreated={created} onCancel={stopAdding} />;
  else if (selectedId !== null)
    inspector = <LocationPanel key={selectedId} id={selectedId} onChanged={() => void load()} />;
  else inspector = <p className={mutedClass}>Pick a location on the map or in the list to see it here.</p>;

  return (
    <MapWorkspace
      panel={panel}
      inspector={inspector}
      map={
        mapId ? (
          <LoreMap
            mapId={mapId}
            markers={markers}
            selectedId={selectedId}
            pin={adding ? pin : null}
            adding={adding}
            focus={focus}
            onSelect={(id) => select(id)}
            onPlace={setPin}
            className={mapFrameClass}
          />
        ) : (
          <LoadingSkeleton variant="map" label="Loading map…" className={`${mapFrameClass} overflow-hidden`} />
        )
      }
    />
  );
}
