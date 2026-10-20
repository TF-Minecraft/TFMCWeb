"use client";

import { cleanRegionName } from "@/app/lib/mapLabels";

import type { MapId, OverlayBBox, RegionRecord } from "../types";
import { FocusIcon } from "./MapIcons";
import PanelHeader from "./PanelHeader";
import { Banner, Fact, Section } from "./RealmPanel";
import { mapControlClass, mapLinkClass } from "../ui";

export type CoalitionMember = { id: string; name: string; rgb: string | null; size: number };

/** The coalition fields `coalitiongen.compile_coalition_regions` adds to a region record. */
export type CoalitionRecord = {
  name?: string;
  leader?: string;
  leader_name?: string;
  target?: string;
  target_name?: string;
  target_rgb?: string | null;
  target_overlay?: OverlayBBox;
  offensive?: boolean;
  members?: CoalitionMember[];
  size?: number;
  banner?: string | null;
};

export type CoalitionPanelProps = {
  mapId: MapId;
  regionId: string;
  regionData: RegionRecord;
  sessionToken?: string | null;
  /** Open a member's or the target's realm card, on the realm map. */
  onOpenRealm: (realmId: string) => void;
  onFocusRegion?: () => void;
  /** Frame the target's realm; absent when it holds no land. */
  onFocusTarget?: () => void;
  onClose: () => void;
};

function Swatch({ rgb }: { rgb: string | null | undefined }) {
  return (
    <span
      aria-hidden
      className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/60"
      style={{ backgroundColor: rgb ? `rgb(${rgb})` : "#555" }}
    />
  );
}

function RealmButton({ id, name, onOpenRealm }: { id: string; name: string; onOpenRealm: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpenRealm(id)} className={`${mapLinkClass} text-left`}>
      {cleanRegionName(name) || id}
    </button>
  );
}

/**
 * A coalition's card: who leads it, who it stands against and who is in it.
 * Every realm in it opens that realm's own card on the realm map.
 */
export function CoalitionPanelContent(props: CoalitionPanelProps) {
  const { mapId, regionId, regionData, sessionToken, onOpenRealm } = props;
  const coalition = regionData[regionId] as CoalitionRecord | undefined;
  if (!coalition) return null;

  const name = cleanRegionName(coalition.name ?? regionId) || regionId;
  const members = Array.isArray(coalition.members) ? coalition.members : [];
  const stance = coalition.offensive ? "Offensive" : "Defensive";

  return (
    <article aria-label={name}>
      <PanelHeader
        onClose={props.onClose}
        title={name}
        eyebrow={`${stance} coalition`}
        visual={
          <Banner
            mapId={mapId}
            mapType="coalition"
            banner={coalition.banner}
            name={name}
            sessionToken={sessionToken}
            className="h-[5.5rem] w-16 shrink-0"
          />
        }
        subtitle={
          coalition.target ? (
            <p className="mt-1 text-sm text-[var(--tfmc-stone)]">
              Against{" "}
              <RealmButton
                id={coalition.target}
                name={coalition.target_name ?? coalition.target}
                onOpenRealm={onOpenRealm}
              />
            </p>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-baseline gap-2 rounded border border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] bg-black/20 px-3 py-2">
        <span className="shrink-0 text-xs text-[var(--tfmc-mist)]">Led by</span>
        {coalition.leader ? (
          <button
            type="button"
            onClick={() => onOpenRealm(coalition.leader!)}
            className="truncate text-left font-[family-name:var(--font-fraunces)] text-base text-[var(--tfmc-cream)] hover:underline"
          >
            {cleanRegionName(coalition.leader_name ?? coalition.leader) || coalition.leader}
          </button>
        ) : (
          <span className="truncate text-sm italic text-[var(--tfmc-stone)]">Unknown</span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label="Target">
          {coalition.target ? (
            <span className="flex items-center gap-2">
              <Swatch rgb={coalition.target_rgb} />
              <RealmButton
                id={coalition.target}
                name={coalition.target_name ?? coalition.target}
                onOpenRealm={onOpenRealm}
              />
            </span>
          ) : (
            "None"
          )}
        </Fact>
        <Fact label="Stance">{stance}</Fact>
        <Fact label="Members">{members.length}</Fact>
        <Fact label="Land">
          {coalition.size ?? 0} {coalition.size === 1 ? "province" : "provinces"}
        </Fact>
      </dl>

      {props.onFocusRegion || props.onFocusTarget ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {props.onFocusRegion ? (
            <button type="button" onClick={props.onFocusRegion} className={`${mapControlClass} h-9 px-3 text-sm`}>
              <FocusIcon size={16} />
              Zoom to
            </button>
          ) : null}
          {props.onFocusTarget ? (
            <button type="button" onClick={props.onFocusTarget} className={`${mapControlClass} h-9 px-3 text-sm`}>
              <FocusIcon size={16} />
              Zoom to target
            </button>
          ) : null}
        </div>
      ) : null}

      {members.length > 0 ? (
        <Section title={`Members · ${members.length}`}>
          <ul className="space-y-1.5">
            {members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onOpenRealm(member.id)}
                  className="flex w-full items-center gap-2.5 rounded px-1.5 py-1 text-left hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_6%,transparent)]"
                >
                  <Swatch rgb={member.rgb} />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--tfmc-cream)]">
                    {cleanRegionName(member.name) || member.id}
                    {member.id === coalition.leader ? (
                      <span className="ml-1.5 text-xs text-[var(--tfmc-stone)]">Leader</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--tfmc-stone)]">{member.size}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
