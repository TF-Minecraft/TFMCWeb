"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  battleTitle,
  formatCount,
  formatDateTime,
  formatDuration,
  kindLabel,
  provinceLabel,
  resolutionLabel,
  sideColors,
  sideName,
  warHref,
  SIDE_LABEL,
} from "@/lib/wars/format";
import {
  defaultSortDirection,
  livesShare,
  participantsBySide,
  sortFighters,
  type FighterSortKey,
} from "@/lib/wars/math";
import type { BattleReport, WarSide } from "@/lib/wars/types";

import ParticipantsTable from "./ParticipantsTable";
import {
  Section,
  SideLabel,
  Swatch,
  chipClass,
  eyebrowClass,
  linkClass,
  mutedClass,
  pageClass,
  sideStyle,
  sideVar,
} from "./WarUi";

const SIDES: WarSide[] = ["attacker", "defender"];

const COLUMNS: Array<{ key: FighterSortKey; label: string; numeric: boolean }> = [
  { key: "name", label: "Fighter", numeric: false },
  { key: "class_name", label: "Class", numeric: false },
  { key: "kills", label: "Kills", numeric: true },
  { key: "deaths", label: "Deaths", numeric: true },
  { key: "assists", label: "Assists", numeric: true },
  { key: "damage", label: "Damage", numeric: true },
  { key: "damage_taken", label: "Damage taken", numeric: true },
  { key: "healing", label: "Healing", numeric: true },
  { key: "cc", label: "Crowd control (s)", numeric: true },
  { key: "friendly_damage", label: "Friendly fire", numeric: true },
];

function FighterTable({ report }: { report: BattleReport }) {
  const [sort, setSort] = useState<{ key: FighterSortKey; direction: "asc" | "desc" }>({
    key: "kills",
    direction: "desc",
  });
  const [side, setSide] = useState<WarSide | "all">("all");
  const fighters = useMemo(() => {
    const rows = (report.fighters ?? []).filter((f) => side === "all" || f.side === side);
    return sortFighters(rows, sort.key, sort.direction);
  }, [report.fighters, side, sort]);
  const choose = (key: FighterSortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: defaultSortDirection(key) },
    );
  const filterButton = (value: WarSide | "all", label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={side === value}
      onClick={() => setSide(value)}
      className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)] ${
        side === value
          ? "border-transparent bg-[var(--tfmc-cream)] font-semibold text-[var(--tfmc-forest-deep)]"
          : "border-[color-mix(in_srgb,var(--tfmc-cream)_18%,transparent)] text-[var(--tfmc-stone)] hover:text-[var(--tfmc-cream)]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show fighters of">
        {filterButton("all", "Both sides")}
        {filterButton("attacker", SIDE_LABEL.attacker)}
        {filterButton("defender", SIDE_LABEL.defender)}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)]">
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                    className={`px-2 py-2 text-xs font-medium uppercase tracking-wider ${column.numeric ? "text-right" : "text-left"}`}
                  >
                    <button
                      type="button"
                      onClick={() => choose(column.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-[var(--tfmc-cream)] focus-visible:outline-2 focus-visible:outline-[var(--tfmc-accent)] ${active ? "text-[var(--tfmc-cream)]" : "text-[var(--tfmc-mist)]"}`}
                    >
                      {column.label}
                      <span aria-hidden className="w-2">
                        {active ? (sort.direction === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fighters.map((fighter, i) => (
              <tr
                key={`${fighter.name}-${i}`}
                className="border-b border-[color-mix(in_srgb,var(--tfmc-cream)_6%,transparent)]"
              >
                <th scope="row" className="px-2 py-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <Swatch color={sideVar(fighter.side)} className="h-2.5 w-2.5" />
                    <span>
                      <span className="block font-semibold text-[var(--tfmc-cream)]">{fighter.name}</span>
                      <span className="block text-xs text-[var(--tfmc-mist)]">
                        {fighter.hired_by ? `Mercenary of ${fighter.hired_by}` : (fighter.faction ?? "No faction")}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="px-2 py-2 text-[var(--tfmc-stone)]">{fighter.class_name ?? "–"}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">{fighter.kills}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">{fighter.deaths}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">{fighter.assists}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.damage)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.damage_taken)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.healing)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.cc)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.friendly_damage)}
                  {fighter.team_kills ? (
                    <span className="block text-xs text-[var(--tfmc-mist)]">
                      {fighter.team_kills} {fighter.team_kills === 1 ? "ally killed" : "allies killed"}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BattleReportView({ report }: { report: BattleReport }) {
  const colors = sideColors(report.leaders.attacker, report.leaders.defender);
  const names = {
    attacker: sideName(report.leaders.attacker, "attacker"),
    defender: sideName(report.leaders.defender, "defender"),
  };
  const battle = report.battle;
  const place = provinceLabel(battle?.province_name ?? null, battle?.province_id ?? null);
  const title = report.name ?? (report.raid ? `Raid on ${place}` : `Battle of ${place}`);
  const winner = report.winner;
  const bySide = participantsBySide(report.participants);
  const deaths = battle?.deaths;
  return (
    <main className={pageClass} style={sideStyle(colors)}>
      <p className="mb-4 text-sm">
        <Link href={warHref(report.map_id, report.war_key)} className={linkClass}>
          {report.war_name}
        </Link>
      </p>
      <div className="flex flex-col gap-6">
        <header className="overflow-hidden rounded-[10px] border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_94%,transparent)] shadow-[0_8px_24px_rgb(0_0_0/0.35)]">
          <div
            className="px-4 py-2 font-semibold text-[var(--tfmc-cream)] sm:px-6"
            style={{
              background: winner
                ? `color-mix(in srgb, ${sideVar(winner)} 30%, var(--tfmc-forest-deep))`
                : "color-mix(in srgb, var(--tfmc-cream) 6%, transparent)",
              borderLeft: `4px solid ${winner ? sideVar(winner) : "var(--tfmc-mist)"}`,
            }}
          >
            {winner ? `Victory for ${names[winner]}` : "No side carried the day"}
          </div>
          <div className="p-4 sm:p-6">
            <p className={eyebrowClass}>{battle ? battleTitle(battle) : kindLabel(report.type)}</p>
            <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl text-[var(--tfmc-cream)] sm:text-4xl">
              {title}
            </h1>
            <p className={`mt-2 text-sm ${mutedClass}`}>
              {[
                place,
                formatDateTime(report.started_at),
                report.duration_seconds != null ? `Lasted ${formatDuration(report.duration_seconds)}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className={chipClass}>{report.raid ? "Raid" : kindLabel(battle?.kind ?? report.type)}</span>
              {report.naval ? <span className={chipClass}>Naval</span> : null}
              {battle ? <span className={chipClass}>{resolutionLabel(battle.resolution)}</span> : null}
            </div>
          </div>
        </header>

        <Section id="sides" eyebrow="The sides" title="Lives left">
          <div className="grid gap-4 sm:grid-cols-2">
            {SIDES.map((side) => {
              const lives = report.sides?.[side];
              return (
                <div key={side}>
                  <div className="flex items-baseline justify-between gap-2">
                    <SideLabel side={side} />
                    <span className="text-sm text-[var(--tfmc-cream)]">{names[side]}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${livesShare(lives) * 100}%`, background: sideVar(side) }}
                    />
                  </div>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    {lives ? `${lives.left} of ${lives.max} lives left` : "Lives were not recorded"}
                    {deaths ? ` · ${deaths[side]} fell` : ""}
                    {battle?.regiments_lost
                      ? ` · ${battle.regiments_lost[side]} ${battle.regiments_lost[side] === 1 ? "regiment" : "regiments"} lost`
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {report.participants.length ? (
          <Section id="factions" eyebrow="Per faction" title="Who fought">
            <div className="flex flex-col gap-6">
              {SIDES.map((side) => (
                <ParticipantsTable key={side} side={side} rows={bySide[side]} showJoined={false} />
              ))}
            </div>
          </Section>
        ) : null}

        {report.fighter_stats_public && report.fighters?.length ? (
          <Section id="fighters" eyebrow="Fighters" title={`${report.fighters.length} fighters`}>
            <FighterTable report={report} />
          </Section>
        ) : !report.fighter_stats_public ? (
          <p className={`text-sm ${mutedClass}`}>
            Individual fighters are not shown on this server; the totals per faction are above.
          </p>
        ) : null}
      </div>
    </main>
  );
}
