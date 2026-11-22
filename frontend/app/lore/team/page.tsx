"use client";

import { useEffect, useState } from "react";

import { getTeam, headUrl, loreErrorMessage, type RosterPerson, type Team } from "@/lib/lore/api";
import { formatInstant } from "@/lib/lore/dates";
import AdminColumn from "../../components/admin/AdminColumn";
import { mutedClass, rowClass } from "../../components/admin/ui";
import { Notice, Section } from "../../components/lore/DetailParts";

function Head({ person }: { person: RosterPerson }) {
  if (!person.has_head)
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] text-sm font-semibold text-[var(--tfmc-mist)]"
      >
        {person.name.slice(0, 1).toUpperCase()}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={headUrl(person.user_id)}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-sm [image-rendering:pixelated]"
    />
  );
}

function RosterGroup({ title, people }: { title: string; people: RosterPerson[] }) {
  return (
    <Section title={title}>
      {people.length ? (
        <ul className={rowClass}>
          {people.map((person) => (
            <li key={person.user_id} className="flex items-center gap-3 py-2.5">
              <Head person={person} />
              <span className="text-[var(--tfmc-cream)]">{person.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={mutedClass}>No one on the roster.</p>
      )}
    </Section>
  );
}

export default function LoreTeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getTeam()
      .then((next) => live && setTeam(next))
      .catch((err) => live && setError(loreErrorMessage(err)));
    return () => {
      live = false;
    };
  }, []);

  return (
    <AdminColumn>
      <p className={`${mutedClass} mt-6`}>
        Access comes from Discord roles: Lore Helper for the whole panel, Helper for the calendar. Ask a Discord admin
        to change roles.
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {!team && !error ? <Notice>Loading…</Notice> : null}
      {team ? (
        <>
          <p className={`${mutedClass} mt-2`}>
            {team.synced_at ? `Last synced ${formatInstant(team.synced_at)}` : "Roles have never been synced."}
          </p>
          {team.unlinked > 0 ? (
            <p className={mutedClass}>
              {team.unlinked === 1
                ? "1 role holder hasn't signed in to the site yet"
                : `${team.unlinked} role holders haven't signed in to the site yet`}
            </p>
          ) : null}
          <RosterGroup title="Lore Helpers" people={team.lore_helpers} />
          <RosterGroup title="Helpers" people={team.helpers} />
          <RosterGroup title="Staff" people={team.staff} />
        </>
      ) : null}
    </AdminColumn>
  );
}
