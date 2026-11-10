"use client";

import { formatCount, formatDay, formatKd, formatPercent, roleLabel, SIDE_LABEL } from "@/lib/wars/format";
import type { WarParticipant, WarSide } from "@/lib/wars/types";

import { FactionName, Swatch, sideVar } from "./WarUi";

const thBase = "px-2 py-2 text-xs font-medium uppercase tracking-wider text-[var(--tfmc-mist)]";
const th = `${thBase} text-right`;
const thLeft = `${thBase} text-left`;
const td = "px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]";

function participantColor(row: WarParticipant): string {
  // The side's colour marks the side; a faction's own colour is only its swatch.
  if (row.faction.rgb) return `rgb(${row.faction.rgb.split(",").join(" ")})`;
  return sideVar(row.side);
}

/** One side's factions: fighters, kills, losses and each one's share of the side's kills. */
export default function ParticipantsTable({
  side,
  rows,
  showJoined = true,
}: {
  side: WarSide;
  rows: WarParticipant[];
  showJoined?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--tfmc-stone)]">
        <Swatch color={sideVar(side)} className="h-3 w-3" />
        {SIDE_LABEL[side]}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)]">
              <th scope="col" className={thLeft}>
                Faction
              </th>
              {showJoined ? (
                <th scope="col" className={thLeft}>
                  Joined
                </th>
              ) : null}
              <th scope="col" className={th}>
                Fighters
              </th>
              <th scope="col" className={th}>
                Kills
              </th>
              <th scope="col" className={th}>
                Deaths
              </th>
              <th scope="col" className={th}>
                K/D
              </th>
              <th scope="col" className={th}>
                Damage
              </th>
              <th scope="col" className={th}>
                Healing
              </th>
              <th scope="col" className={th}>
                Regiments lost
              </th>
              <th scope="col" className={`${th} w-40`}>
                Share of side kills
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.faction.id ?? row.faction.name}-${row.mercenary}`}
                className="border-b border-[color-mix(in_srgb,var(--tfmc-cream)_6%,transparent)]"
              >
                <th scope="row" className="px-2 py-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <Swatch color={participantColor(row)} className="h-3 w-3" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-[var(--tfmc-cream)]">
                        {row.mercenary ? "Mercenaries of " : null}
                        <FactionName faction={row.faction} />
                      </span>
                      {row.role && !row.mercenary ? (
                        <span className="block text-xs text-[var(--tfmc-mist)]">{roleLabel(row.role)}</span>
                      ) : null}
                    </span>
                  </span>
                </th>
                {showJoined ? (
                  <td className="px-2 py-2 text-left text-[var(--tfmc-stone)]">
                    {row.mercenary ? "Hired" : row.joined_at ? formatDay(row.joined_at) : "At declaration"}
                  </td>
                ) : null}
                <td className={td}>{formatCount(row.fighters)}</td>
                <td className={td}>{formatCount(row.kills)}</td>
                <td className={td}>{formatCount(row.deaths)}</td>
                <td className={td}>{row.fighters ? formatKd(row.kills, row.deaths) : "–"}</td>
                <td className={td}>{formatCount(row.damage)}</td>
                <td className={td}>{formatCount(row.healing)}</td>
                <td className={td}>{formatCount(row.regiments_lost)}</td>
                <td className="px-2 py-2">
                  <span className="flex items-center justify-end gap-2">
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.round((row.share_of_side_kills ?? 0) * 100)}%`,
                          background: sideVar(side),
                        }}
                      />
                    </span>
                    <span className="w-9 text-right tabular-nums text-[var(--tfmc-stone)]">
                      {formatPercent(row.share_of_side_kills)}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
