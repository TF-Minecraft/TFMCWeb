"use client";

import Link from "next/link";

import { formatCount, formatDay, goalLabel, sideColors, sideName, summaryStatusChip, warHref } from "@/lib/wars/format";
import { pairShare } from "@/lib/wars/math";
import type { WarSide, WarSummary } from "@/lib/wars/types";

import {
  FactionBanner,
  FactionName,
  SplitBar,
  chipClass,
  eyebrowClass,
  mutedClass,
  pageClass,
  sideStyle,
  sideVar,
} from "./WarUi";

function SideOfCard({
  war,
  side,
  mapId,
  sessionToken,
}: {
  war: WarSummary;
  side: WarSide;
  mapId: string;
  sessionToken?: string | null;
}) {
  const { leaders, count } = war.sides[side];
  const leader = leaders[0] ?? null;
  const others = Math.max(0, count - Math.max(1, leaders.length));
  const right = side === "defender";
  return (
    <div className={`flex min-w-0 items-center gap-3 ${right ? "flex-row-reverse text-right" : ""}`}>
      <FactionBanner
        mapId={mapId}
        faction={war.known_from_records_only ? null : leader}
        color={sideVar(side)}
        sessionToken={sessionToken}
        className="h-14 w-7 sm:h-16 sm:w-8"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--tfmc-cream)]">
          {leader ? <FactionName faction={leader} /> : sideName(null, side, true)}
        </p>
        <p className="text-xs text-[var(--tfmc-mist)]">
          {side === "attacker" ? "Attacker" : "Defender"}
          {others > 0 ? ` · +${others} ${others === 1 ? "faction" : "factions"}` : ""}
        </p>
      </div>
    </div>
  );
}

export function WarCard({
  war,
  mapId,
  sessionToken,
  now,
}: {
  war: WarSummary;
  mapId: string;
  sessionToken?: string | null;
  now?: Date;
}) {
  const colors = war.known_from_records_only
    ? sideColors(null, null)
    : sideColors(war.sides.attacker.leaders[0], war.sides.defender.leaders[0]);
  const { score } = war;
  const route = score.occupation.route_length;
  const goal = goalLabel(war.goal);
  const dates =
    war.status === "ended"
      ? [formatDay(war.started_at), formatDay(war.ended_at)].filter(Boolean).join(" – ")
      : war.started_at
        ? `Since ${formatDay(war.started_at)}`
        : "";
  return (
    <Link
      href={warHref(mapId, war.war_key)}
      style={sideStyle(colors)}
      className="group block rounded-[10px] border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_94%,transparent)] p-4 shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-colors hover:border-[color-mix(in_srgb,var(--tfmc-cream)_35%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)] sm:p-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <SideOfCard war={war} side="attacker" mapId={mapId} sessionToken={sessionToken} />
        <span className="font-[family-name:var(--font-fraunces)] text-sm italic text-[var(--tfmc-mist)]">vs</span>
        <SideOfCard war={war} side="defender" mapId={mapId} sessionToken={sessionToken} />
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--tfmc-cream)] group-hover:underline group-hover:decoration-[color-mix(in_srgb,var(--tfmc-cream)_35%,transparent)] group-hover:underline-offset-4">
          {war.name}
        </h3>
        <span className={chipClass}>{summaryStatusChip(war, now)}</span>
      </div>
      <p className={`mt-1 text-sm ${mutedClass}`}>
        {[goal, war.civil_war ? "Civil war" : "", dates].filter(Boolean).join(" · ")}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className={eyebrowClass}>Battles won</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--tfmc-cream)]">
            {war.battles_won.attacker}–{war.battles_won.defender}
          </dd>
        </div>
        <div>
          <dt className={eyebrowClass}>Provinces taken</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--tfmc-cream)]">
            {route ? `${score.occupation.attacker}/${route}` : "–"}
          </dd>
        </div>
        <div>
          <dt className={eyebrowClass}>Casualties</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--tfmc-cream)]">
            {formatCount(war.deaths.attacker)} / {formatCount(war.deaths.defender)}
          </dd>
        </div>
      </dl>
      <SplitBar share={pairShare(war.battles_won)} className="mt-3 h-1.5" />
    </Link>
  );
}

function WarSection({
  id,
  title,
  wars,
  empty,
  mapId,
  sessionToken,
  now,
}: {
  id: string;
  title: string;
  wars: WarSummary[];
  empty: string;
  mapId: string;
  sessionToken?: string | null;
  now?: Date;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--tfmc-cream)]">
        {title}
      </h2>
      {wars.length ? (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {wars.map((war) => (
            <li key={war.war_key}>
              <WarCard war={war} mapId={mapId} sessionToken={sessionToken} now={now} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-3 ${mutedClass}`}>{empty}</p>
      )}
    </section>
  );
}

export default function WarsIndexView({
  wars,
  mapId,
  sessionToken,
  now,
}: {
  wars: WarSummary[];
  mapId: string;
  sessionToken?: string | null;
  now?: Date;
}) {
  const active = wars.filter((war) => war.status === "active");
  const ended = wars.filter((war) => war.status === "ended");
  return (
    <main className={pageClass}>
      <h1 className="font-[family-name:var(--font-fraunces)] text-4xl text-[var(--tfmc-cream)]">Wars</h1>
      <p className={`mt-3 max-w-2xl ${mutedClass}`}>
        Every war fought on the server: who took the field, the battles and what they cost. Times are server time
        (CET/CEST).
      </p>
      <WarSection
        id="wars-active"
        title="Wars in progress"
        wars={active}
        empty="No war is being fought right now."
        mapId={mapId}
        sessionToken={sessionToken}
        now={now}
      />
      <WarSection
        id="wars-ended"
        title="Concluded wars"
        wars={ended}
        empty="No war has ended yet."
        mapId={mapId}
        sessionToken={sessionToken}
        now={now}
      />
    </main>
  );
}
