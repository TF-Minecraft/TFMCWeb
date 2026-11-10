"use client";

import Link from "next/link";

import { mapBaseHref } from "@/app/lib/map/chronicleDayRoute";
import {
  battleHref,
  battleTitle,
  formatCount,
  formatDateTime,
  formatDay,
  frontSentence,
  goalLabel,
  provinceLabel,
  resolutionLabel,
  roleLabel,
  sideColors,
  sideLeader,
  sideName,
  statusLine,
  warsHref,
  SIDE_LABEL,
} from "@/lib/wars/format";
import {
  deathBarWidths,
  frontCells,
  heroes,
  MOMENTUM_WEIGHTS,
  momentum,
  orderBattles,
  pairShare,
  participantsBySide,
  worstSideLoss,
} from "@/lib/wars/math";
import type { FactionRef, TopFighter, WarBattle, WarPageModel, WarSide } from "@/lib/wars/types";

import ParticipantsTable from "./ParticipantsTable";
import WarCasualtyChart from "./WarCasualtyChart";
import {
  FactionBanner,
  FactionName,
  PairTile,
  Section,
  SideLabel,
  SplitBar,
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

type Leaders = Record<WarSide, FactionRef | null>;

/** Leaders from the state; a war known only from records names its sides after their biggest faction. */
export function warLeaders(model: WarPageModel): Leaders {
  const out: Leaders = { attacker: null, defender: null };
  for (const side of SIDES) {
    out[side] =
      sideLeader(model.state, side) ??
      [...model.participants]
        .filter((row) => row.side === side && !row.mercenary)
        .sort((a, b) => b.fighters - a.fighters)[0]?.faction ??
      null;
  }
  return out;
}

function SideHeader({
  model,
  side,
  leader,
  sessionToken,
}: {
  model: WarPageModel;
  side: WarSide;
  leader: FactionRef | null;
  sessionToken?: string | null;
}) {
  const members = (model.state?.sides[side] ?? []).filter((row) => row !== leader && row.role !== "leader");
  const right = side === "defender";
  return (
    <div className={`flex min-w-0 flex-col gap-3 ${right ? "items-end text-right" : "items-start"}`}>
      <SideLabel side={side} />
      <div className={`flex items-center gap-3 ${right ? "flex-row-reverse" : ""}`}>
        <FactionBanner
          mapId={model.map_id}
          faction={model.state ? leader : null}
          color={sideVar(side)}
          sessionToken={sessionToken}
          className="h-20 w-10 sm:h-28 sm:w-14"
        />
        <p className="min-w-0 font-[family-name:var(--font-fraunces)] text-lg leading-tight text-[var(--tfmc-cream)] sm:text-2xl">
          {leader ? <FactionName faction={leader} /> : sideName(null, side, true)}
        </p>
      </div>
      {members.length ? (
        <ul
          className={`flex flex-wrap gap-1.5 ${right ? "justify-end" : ""}`}
          aria-label={`${SIDE_LABEL[side]} allies`}
        >
          {members.map((member) => (
            <li key={member.id ?? member.name} className={chipClass}>
              <span className="text-[var(--tfmc-cream)]">{member.name}</span>
              {member.role ? <span>· {roleLabel(member.role)}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function WarHeader({
  model,
  leaders,
  sessionToken,
}: {
  model: WarPageModel;
  leaders: Leaders;
  sessionToken?: string | null;
}) {
  const goal = goalLabel(model.state?.goal);
  return (
    <header className="rounded-[10px] border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--war-attacker)_16%,var(--tfmc-forest-deep))_0%,var(--tfmc-forest-deep)_40%,var(--tfmc-forest-deep)_60%,color-mix(in_srgb,var(--war-defender)_16%,var(--tfmc-forest-deep))_100%)] p-4 shadow-[0_8px_24px_rgb(0_0_0/0.35)] sm:p-6">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
        <div className="col-span-2 row-start-1 text-center md:col-span-1 md:col-start-2">
          <p className={eyebrowClass}>{model.state?.civil_war ? "Civil war" : "War"}</p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl leading-tight text-[var(--tfmc-cream)] sm:text-4xl">
            {model.name}
          </h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>
            {[goal ? `Goal: ${goal}` : "", model.started_at ? `Declared ${formatDay(model.started_at)}` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2 font-semibold text-[var(--tfmc-cream)]">{statusLine(model)}</p>
          {model.result?.truce_until ? (
            <p className={`mt-1 text-sm ${mutedClass}`}>Truce until {formatDay(model.result.truce_until)}.</p>
          ) : null}
          {!model.state ? (
            <p className={`mt-2 text-sm ${mutedClass}`}>
              This war was fought before the site kept war records; only its battle reports survive.
            </p>
          ) : null}
        </div>
        <div className="md:col-start-1 md:row-start-1">
          <SideHeader model={model} side="attacker" leader={leaders.attacker} sessionToken={sessionToken} />
        </div>
        <div className="md:col-start-3 md:row-start-1">
          <SideHeader model={model} side="defender" leader={leaders.defender} sessionToken={sessionToken} />
        </div>
      </div>
    </header>
  );
}

function ScoreSection({ model, names }: { model: WarPageModel; names: Record<WarSide, string> }) {
  const { score } = model;
  const m = momentum(score);
  const route = score.occupation.route_length;
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  return (
    <Section id="score" eyebrow="War score" title="Momentum">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-[var(--tfmc-cream)]">
          {names.attacker} <span className="tabular-nums text-[var(--tfmc-stone)]">{pct(m.attacker)}</span>
        </span>
        <span className="text-right font-semibold text-[var(--tfmc-cream)]">
          <span className="tabular-nums text-[var(--tfmc-stone)]">{pct(m.defender)}</span> {names.defender}
        </span>
      </div>
      <div className="relative mt-2">
        <SplitBar share={m.attacker} className="h-4" />
        <span aria-hidden className="absolute inset-y-[-3px] left-1/2 w-px bg-[var(--tfmc-cream)] opacity-60" />
      </div>
      <p className="sr-only">
        Momentum: {names.attacker} {pct(m.attacker)}, {names.defender} {pct(m.defender)}.
      </p>
      <p className="mt-2 text-xs text-[var(--tfmc-mist)]">
        Momentum weighs battles won ({pct(MOMENTUM_WEIGHTS.battles)}), ground taken along the route (
        {pct(MOMENTUM_WEIGHTS.ground)}) and losses inflicted ({pct(MOMENTUM_WEIGHTS.casualties)}). It is a reading of
        the war so far, not the game&apos;s own war score.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PairTile
          label="Battles won"
          attacker={score.battles_won.attacker}
          defender={score.battles_won.defender}
          share={pairShare(score.battles_won)}
        />
        <PairTile
          label="Provinces held"
          attacker={route ? `${score.occupation.attacker}/${route}` : score.occupation.attacker}
          defender={score.occupation.defender}
          share={pairShare({ attacker: score.occupation.attacker, defender: score.occupation.defender })}
          note={route ? `Of ${route} provinces on the route` : undefined}
        />
        <PairTile
          label="Casualties"
          attacker={formatCount(score.deaths.attacker)}
          defender={formatCount(score.deaths.defender)}
          share={pairShare(score.deaths)}
        />
        <PairTile
          label="Regiments lost"
          attacker={score.regiments_lost.attacker}
          defender={score.regiments_lost.defender}
          share={pairShare(score.regiments_lost)}
        />
      </div>
    </Section>
  );
}

function FrontSection({ model, names }: { model: WarPageModel; names: Record<WarSide, string> }) {
  const route = model.state?.route_length ?? null;
  if (!model.state || !route) return null;
  const { attacker: taken, defender: lost } = model.score.occupation;
  const { behind, route: cells } = frontCells(route, taken, lost);
  const objective = provinceLabel(model.objective_province_name, model.state.objective_province_id ?? null);
  return (
    <Section id="front" eyebrow="The front" title={`The road to ${objective}`}>
      <p className={`text-sm ${mutedClass}`}>{frontSentence(names, taken, lost, route, objective)}</p>
      <div
        className="mt-4 flex items-stretch gap-2"
        role="img"
        aria-label={`Front: ${taken} of ${route} provinces taken`}
      >
        {behind.length ? (
          <div className="flex gap-[2px]">
            {behind.map((cell) => (
              <span
                key={`b${cell.index}`}
                className="h-8 w-4 rounded-[3px] sm:w-6"
                style={{ background: sideVar("defender") }}
                title="An attacker province held by the defenders"
              />
            ))}
          </div>
        ) : null}
        <span
          aria-hidden
          className="w-[3px] rounded-full bg-[var(--tfmc-cream)] opacity-70"
          title="The attackers' border"
        />
        <div className="flex min-w-0 flex-1 gap-[2px]">
          {cells.map((cell) => (
            <span
              key={cell.index}
              className="relative h-8 min-w-0 flex-1 rounded-[3px]"
              style={{
                background: sideVar(cell.holder),
                opacity: cell.taken || cell.holder === "attacker" ? 1 : 0.45,
              }}
              title={
                cell.objective
                  ? `${objective}, the objective`
                  : cell.taken
                    ? "Taken by the attackers"
                    : "Held by the defenders"
              }
            >
              {cell.objective ? (
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[var(--tfmc-cream)]"
                >
                  <path d="M4 2v12M4 2h8l-2 3 2 3H4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[var(--tfmc-mist)]">
        <span>Border</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Swatch color={sideVar("attacker")} className="h-2.5 w-2.5" /> Taken by {names.attacker}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Swatch color={sideVar("defender")} className="h-2.5 w-2.5 opacity-45" /> Held by {names.defender}
          </span>
        </span>
        <span>Objective: {objective}</span>
      </div>
      <p className="mt-4">
        <Link href={mapBaseHref(model.map_id)} className={`${linkClass} text-sm`}>
          View on map
        </Link>
      </p>
    </Section>
  );
}

function winnerText(battle: WarBattle, names: Record<WarSide, string>): string {
  if (!battle.winner) return "No side carried the day";
  return `Victory for ${names[battle.winner]}`;
}

function DeathBars({ battle, worst }: { battle: WarBattle; worst: number }) {
  const widths = deathBarWidths(battle.deaths, worst);
  return (
    <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-2">
      <span className="text-right text-lg tabular-nums text-[var(--tfmc-cream)]">{battle.deaths.attacker}</span>
      <span className="flex h-3 justify-end">
        <span
          className="h-full rounded-l-[3px]"
          style={{ width: `${widths.attacker * 100}%`, background: sideVar("attacker") }}
        />
      </span>
      <span className="flex h-3">
        <span
          className="h-full rounded-r-[3px]"
          style={{ width: `${widths.defender * 100}%`, background: sideVar("defender") }}
        />
      </span>
      <span className="text-lg tabular-nums text-[var(--tfmc-cream)]">{battle.deaths.defender}</span>
    </div>
  );
}

function PairLine({ label, attacker, defender }: { label: string; attacker: string; defender: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 text-sm">
      <span className="text-right tabular-nums text-[var(--tfmc-cream)]">{attacker}</span>
      <span className="w-28 text-center text-xs uppercase tracking-wider text-[var(--tfmc-mist)]">{label}</span>
      <span className="tabular-nums text-[var(--tfmc-cream)]">{defender}</span>
    </div>
  );
}

function BattleCard({
  battle,
  model,
  names,
  worst,
}: {
  battle: WarBattle;
  model: WarPageModel;
  names: Record<WarSide, string>;
  worst: number;
}) {
  const winner = battle.winner;
  const lives = battle.lives;
  return (
    <li className="overflow-hidden rounded-[8px] border border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_45%,transparent)]">
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
        style={{
          background: winner
            ? `color-mix(in srgb, ${sideVar(winner)} 28%, var(--tfmc-forest-deep))`
            : "color-mix(in srgb, var(--tfmc-cream) 6%, transparent)",
          borderLeft: `4px solid ${winner ? sideVar(winner) : "var(--tfmc-mist)"}`,
        }}
      >
        <p className="font-semibold text-[var(--tfmc-cream)]">{winnerText(battle, names)}</p>
        <span className="flex flex-wrap gap-1.5">
          <span className={chipClass}>{resolutionLabel(battle.resolution)}</span>
          {battle.leg && battle.leg !== "invasion" ? (
            <span className={chipClass}>{battle.leg.replace(/_/g, " ")}</span>
          ) : null}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--tfmc-cream)]">
            {battleTitle(battle)}
          </h3>
          {battle.name ? <span className={`text-sm ${mutedClass}`}>{battle.name}</span> : null}
        </div>
        <div>
          <p className="mb-1 text-center text-xs uppercase tracking-wider text-[var(--tfmc-mist)]">Deaths</p>
          <DeathBars battle={battle} worst={worst} />
        </div>
        {battle.regiments_lost ? (
          <PairLine
            label="Regiments lost"
            attacker={String(battle.regiments_lost.attacker)}
            defender={String(battle.regiments_lost.defender)}
          />
        ) : null}
        {lives ? (
          <PairLine
            label="Lives left"
            attacker={`${lives.attacker.left} of ${lives.attacker.max}`}
            defender={`${lives.defender.left} of ${lives.defender.max}`}
          />
        ) : null}
        {battle.fighters ? (
          <PairLine
            label="Fighters"
            attacker={String(battle.fighters.attacker)}
            defender={String(battle.fighters.defender)}
          />
        ) : null}
        {battle.record_id ? (
          <p className="pt-1 text-right">
            <Link href={battleHref(model.map_id, model.war_key, battle.record_id)} className={`${linkClass} text-sm`}>
              Battle report
            </Link>
          </p>
        ) : null}
      </div>
    </li>
  );
}

function LedgerSection({ model, names }: { model: WarPageModel; names: Record<WarSide, string> }) {
  const battles = orderBattles(model.battles);
  const worst = worstSideLoss(battles);
  const { deaths } = model.score;
  return (
    <Section
      id="ledger"
      eyebrow="Battle ledger"
      title={
        battles.length ? `${battles.length} ${battles.length === 1 ? "engagement" : "engagements"}` : "No battles yet"
      }
    >
      {battles.length ? (
        <>
          <ol className="grid gap-4 md:grid-cols-2">
            {battles.map((battle, i) => (
              <BattleCard
                key={battle.record_id ?? `${battle.battle_number}-${i}`}
                battle={battle}
                model={model}
                names={names}
                worst={worst}
              />
            ))}
          </ol>
          <div className="mt-5 rounded-[8px] border border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] p-4">
            <p className="mb-1 text-center text-xs uppercase tracking-wider text-[var(--tfmc-mist)]">Total deaths</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-3">
              <span className="text-right font-[family-name:var(--font-fraunces)] text-3xl tabular-nums text-[var(--tfmc-cream)]">
                {formatCount(deaths.attacker)}
              </span>
              <span className="text-sm text-[var(--tfmc-mist)]">to</span>
              <span className="font-[family-name:var(--font-fraunces)] text-3xl tabular-nums text-[var(--tfmc-cream)]">
                {formatCount(deaths.defender)}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-3 text-xs text-[var(--tfmc-mist)]">
              <span className="text-right">{names.attacker}</span>
              <span>{names.defender}</span>
            </div>
          </div>
        </>
      ) : (
        <p className={mutedClass}>No battle has been fought yet. The ledger fills in as battles are settled.</p>
      )}
    </Section>
  );
}

function HeroCard({ title, fighter, value }: { title: string; fighter: TopFighter | null; value: string }) {
  return (
    <div className="rounded-[8px] border border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] p-4">
      <p className={eyebrowClass}>{title}</p>
      {fighter ? (
        <>
          <p className="mt-2 flex items-center gap-2 font-[family-name:var(--font-fraunces)] text-xl text-[var(--tfmc-cream)]">
            <Swatch color={sideVar(fighter.side)} className="h-3 w-3" />
            {fighter.name}
          </p>
          <p className={`text-sm ${mutedClass}`}>
            {fighter.hired_by ? `Mercenary of ${fighter.hired_by}` : (fighter.faction ?? "No faction")} ·{" "}
            {SIDE_LABEL[fighter.side]}
          </p>
          <p className="mt-2 text-2xl tabular-nums text-[var(--tfmc-cream)]">{value}</p>
        </>
      ) : (
        <p className={`mt-2 text-sm ${mutedClass}`}>Nobody yet.</p>
      )}
    </div>
  );
}

function HeroesSection({ model }: { model: WarPageModel }) {
  if (!model.fighter_stats_public || !model.top_fighters?.length) return null;
  const found = heroes(model.top_fighters);
  const top = model.top_fighters.slice(0, 10);
  return (
    <Section id="heroes" eyebrow="Heroes of the war" title="Who carried the day">
      <div className="grid gap-3 sm:grid-cols-3">
        <HeroCard title="Most kills" fighter={found.kills} value={found.kills ? `${found.kills.kills} kills` : ""} />
        <HeroCard
          title="Most damage"
          fighter={found.damage}
          value={found.damage ? `${formatCount(found.damage.damage)} damage` : ""}
        />
        <HeroCard
          title="Most healing"
          fighter={found.healing}
          value={found.healing ? `${formatCount(found.healing.healing)} healed` : ""}
        />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <caption className="mb-2 text-left text-xs uppercase tracking-widest text-[var(--tfmc-mist)]">
            Top fighters
          </caption>
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] text-xs uppercase tracking-wider text-[var(--tfmc-mist)]">
              <th scope="col" className="px-2 py-2 text-left font-medium">
                Fighter
              </th>
              <th scope="col" className="px-2 py-2 text-left font-medium">
                Fought for
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Battles
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Kills
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Deaths
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Damage
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Healing
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((fighter, i) => (
              <tr
                key={`${fighter.name}-${i}`}
                className="border-b border-[color-mix(in_srgb,var(--tfmc-cream)_6%,transparent)]"
              >
                <th scope="row" className="px-2 py-2 text-left font-semibold text-[var(--tfmc-cream)]">
                  {fighter.name}
                </th>
                <td className="px-2 py-2 text-[var(--tfmc-stone)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Swatch color={sideVar(fighter.side)} className="h-2.5 w-2.5" />
                    {fighter.hired_by ? `Mercenary of ${fighter.hired_by}` : (fighter.faction ?? "No faction")}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">{fighter.battles}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">{fighter.kills}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">{fighter.deaths}</td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.damage)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--tfmc-cream)]">
                  {formatCount(fighter.healing)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ChronicleSection({ model }: { model: WarPageModel }) {
  if (!model.timeline.length) return null;
  return (
    <Section id="chronicle" eyebrow="Chronicle" title="How the war unfolded">
      <ol className="relative ml-2 border-l border-[color-mix(in_srgb,var(--tfmc-cream)_18%,transparent)]">
        {model.timeline.map((entry, i) => {
          const recordId = typeof entry.payload.record_id === "string" ? entry.payload.record_id : null;
          const winner = entry.payload.winner;
          const dot = winner === "attacker" || winner === "defender" ? sideVar(winner) : "var(--tfmc-mist)";
          return (
            <li key={`${entry.at}-${i}`} className="relative pb-5 pl-5 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[5px] top-1.5 h-[9px] w-[9px] rounded-full ring-2 ring-[var(--tfmc-forest-deep)]"
                style={{ background: dot }}
              />
              <p className="text-xs tabular-nums text-[var(--tfmc-mist)]">{formatDateTime(entry.at)}</p>
              <p className="mt-0.5 text-[var(--tfmc-cream)]">
                {entry.summary}
                {recordId ? (
                  <>
                    {" "}
                    <Link href={battleHref(model.map_id, model.war_key, recordId)} className={`${linkClass} text-sm`}>
                      Report
                    </Link>
                  </>
                ) : null}
              </p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

export default function WarPageView({ model, sessionToken }: { model: WarPageModel; sessionToken?: string | null }) {
  const leaders = warLeaders(model);
  const colors = model.state ? sideColors(leaders.attacker, leaders.defender) : sideColors(null, null);
  const names = { attacker: sideName(leaders.attacker, "attacker"), defender: sideName(leaders.defender, "defender") };
  const bySide = participantsBySide(model.participants);
  return (
    <main className={pageClass} style={sideStyle(colors)}>
      <p className="mb-4 text-sm">
        <Link href={warsHref(model.map_id)} className={linkClass}>
          All wars
        </Link>
      </p>
      <div className="flex flex-col gap-6">
        <WarHeader model={model} leaders={leaders} sessionToken={sessionToken} />
        <ScoreSection model={model} names={names} />
        <FrontSection model={model} names={names} />
        <LedgerSection model={model} names={names} />
        {model.battles.length ? (
          <Section id="casualties" eyebrow="Casualties over the war" title="The cost">
            <WarCasualtyChart battles={model.battles} names={names} />
          </Section>
        ) : null}
        {model.participants.length ? (
          <Section id="participants" eyebrow="Participants" title="Who fought">
            <div className="flex flex-col gap-6">
              {SIDES.map((side) => (
                <ParticipantsTable key={side} side={side} rows={bySide[side]} />
              ))}
            </div>
            {!model.fighter_stats_public ? (
              <p className="mt-4 text-xs text-[var(--tfmc-mist)]">
                Individual fighters are not shown on this server; the totals per faction are.
              </p>
            ) : null}
          </Section>
        ) : null}
        <HeroesSection model={model} />
        <ChronicleSection model={model} />
      </div>
    </main>
  );
}
