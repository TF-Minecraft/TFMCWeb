"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import AdminColumn from "../../components/admin/AdminColumn";
import {
  badgeClass,
  buttonClass,
  errorClass,
  headingClass,
  inputClass,
  mutedClass,
  pagerClass,
  panelClass,
  quietButtonClass,
  rowClass,
} from "../../components/admin/ui";
import { Notice } from "../../components/lore/DetailParts";
import { useLoreAccess } from "../../components/lore/LoreFrame";
import {
  addTeamMember,
  getOverview,
  getTeam,
  getTeamCandidates,
  headUrl,
  loreErrorMessage,
  removeTeamMember,
  setTeamLead,
  type RecentEdit,
  type Team,
  type TeamCandidate,
  type TeamMember,
} from "@/lib/lore/api";
import { formatInstant } from "@/lib/lore/dates";

const leadBadge = `${badgeClass} bg-[color-mix(in_srgb,var(--tfmc-accent)_25%,transparent)] text-[var(--tfmc-accent)]`;
const staffBadge = `${badgeClass} bg-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] text-[var(--tfmc-mist)]`;

function Head({ person }: { person: { user_id: number; name: string; has_head?: boolean } }) {
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

/** What a team history entry did, in words, naming the person it was done to. */
function teamAction(entry: RecentEdit): string {
  const name = entry.target?.label || `account ${entry.entity_id}`;
  const lead = entry.changes.is_lead;
  if (entry.action === "added") return lead?.[1] ? `added ${name} as a lead` : `added ${name}`;
  if (entry.action === "removed") return `removed ${name} from the team`;
  if (entry.action === "updated" && lead) return lead[1] ? `made ${name} a lead` : `took lead from ${name}`;
  return `${entry.action.replace(/_/g, " ")} ${name}`;
}

function MemberRow({
  member,
  canManage,
  isSelf,
  onChanged,
}: {
  member: TeamMember;
  canManage: boolean;
  /** Only staff may change their own place, and staff have no row to change. */
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setConfirming(false);
      onChanged();
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <Head person={member} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[var(--tfmc-cream)]">
          {member.name}
          {member.is_lead ? <span className={leadBadge}>Lead</span> : null}
          {member.is_staff ? <span className={staffBadge}>Staff</span> : null}
        </p>
        <p className="text-xs text-[var(--tfmc-stone)]">
          {member.added_at ? `Added ${formatInstant(member.added_at)}` : "Added"}
          {member.added_by_name ? ` by ${member.added_by_name}` : ""}
        </p>
      </div>
      {canManage && !isSelf ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={pagerClass}
            disabled={busy}
            onClick={() => run(() => setTeamLead(member.user_id, !member.is_lead))}
          >
            {member.is_lead ? "Remove lead" : "Make lead"}
          </button>
          {confirming ? (
            <span className="flex items-center gap-3">
              <span className={mutedClass}>Remove {member.name}?</span>
              <button
                type="button"
                className="rounded-sm bg-[#8a3b3b] px-3 py-1.5 text-sm font-semibold text-[var(--tfmc-cream)] disabled:opacity-50"
                disabled={busy}
                onClick={() => run(() => removeTeamMember(member.user_id))}
              >
                Remove
              </button>
              <button type="button" className={quietButtonClass} onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className={quietButtonClass} disabled={busy} onClick={() => setConfirming(true)}>
              Remove
            </button>
          )}
        </div>
      ) : null}
      {error ? (
        <p className={`${errorClass} basis-full`} role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function AddMember({ onAdded }: { onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ q: string; items: TeamCandidate[]; error: string } | null>(null);
  const [asLead, setAsLead] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const search = q.trim();

  useEffect(() => {
    if (search.length < 2) return;
    let live = true;
    const timer = window.setTimeout(() => {
      getTeamCandidates(search)
        .then((items) => live && setResults({ q: search, items, error: "" }))
        .catch((err) => live && setResults({ q: search, items: [], error: loreErrorMessage(err) }));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  async function add(candidate: TeamCandidate) {
    setBusyId(candidate.user_id);
    setError("");
    try {
      await addTeamMember(candidate.user_id, asLead);
      setQ("");
      setResults(null);
      onAdded();
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const current = search.length >= 2 && results?.q === search ? results : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          className={`${inputClass} min-w-0 flex-1`}
          value={q}
          maxLength={64}
          placeholder="Search by Minecraft or Discord name…"
          aria-label="Search for someone to add"
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--tfmc-cream)]">
          <input type="checkbox" checked={asLead} onChange={(e) => setAsLead(e.target.checked)} />
          Add as lead
        </label>
      </div>
      {search.length > 0 && search.length < 2 ? <p className={mutedClass}>Type at least two letters.</p> : null}
      {search.length >= 2 && !current ? <p className={mutedClass}>Searching…</p> : null}
      {current?.error ? (
        <p className={errorClass} role="alert">
          {current.error}
        </p>
      ) : current && current.items.length === 0 ? (
        <p className={mutedClass}>
          No one found who isn’t on the team already. They need to have signed in to the site once.
        </p>
      ) : current ? (
        <ul className={rowClass}>
          {current.items.map((candidate) => (
            <li key={candidate.user_id} className="flex items-center gap-3 py-2">
              <Head person={candidate as TeamCandidate & { has_head?: boolean }} />
              <span className="min-w-0 flex-1 text-sm text-[var(--tfmc-cream)]">
                {candidate.name}
                {candidate.minecraft_name && candidate.minecraft_name !== candidate.name ? (
                  <span className="ml-2 text-xs text-[var(--tfmc-stone)]">{candidate.minecraft_name}</span>
                ) : null}
              </span>
              <button
                type="button"
                className={buttonClass}
                disabled={busyId !== null}
                onClick={() => void add(candidate)}
              >
                {busyId === candidate.user_id ? "Adding…" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function LoreTeamPage() {
  const access = useLoreAccess();
  const canManage = access.can_manage_team;
  const me = access.user;
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentEdit[] | null>(null);

  // Each load is numbered; only the newest may land, so a slow older one can't undo a newer result.
  const loads = useRef(0);
  const load = useCallback(() => {
    const request = ++loads.current;
    const current = () => request === loads.current;
    getTeam()
      .then((next) => {
        if (!current()) return;
        setTeam(next);
        setError("");
      })
      .catch((err) => current() && setError(loreErrorMessage(err)));
    // The team has no history endpoint of its own: the overview's recent edits hold its latest changes.
    getOverview()
      .then((overview) => current() && setRecent(overview.recent.filter((entry) => entry.entity_kind === "team")))
      .catch(() => current() && setRecent([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !team) return <Notice error>{error}</Notice>;
  if (!team) return <Notice>Loading…</Notice>;

  return (
    <AdminColumn>
      {canManage ? (
        <section className={panelClass}>
          <h2 className={`${headingClass} mb-4`}>Add to the team</h2>
          <AddMember onAdded={load} />
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={headingClass}>Lore team</h2>
          <span className={mutedClass}>
            {team.members.length} {team.members.length === 1 ? "member" : "members"}
          </span>
        </div>
        {!canManage ? <p className={mutedClass}>Staff and team leads can change who is on the team.</p> : null}
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
        {team.members.length === 0 ? (
          <p className={`${mutedClass} mt-3`}>No Lore Helpers yet.</p>
        ) : (
          <ul className={rowClass}>
            {team.members.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                canManage={canManage}
                isSelf={Boolean(me && member.user_id === me.user_id && !me.is_staff)}
                onChanged={load}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={panelClass}>
        <h2 className={`${headingClass} mb-2`}>Staff</h2>
        <p className={mutedClass}>Website staff always have access to the lore panel.</p>
        {team.staff.length ? (
          <ul className={`${rowClass} mt-2`}>
            {team.staff.map((person) => (
              <li key={person.user_id} className="flex items-center gap-3 py-2.5">
                <Head person={person} />
                <span className="text-[var(--tfmc-cream)]">{person.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={panelClass}>
        <h2 className={`${headingClass} mb-2`}>Recent team changes</h2>
        {recent === null ? (
          <p className={mutedClass}>Loading…</p>
        ) : recent.length === 0 ? (
          <p className={mutedClass}>No team changes among the panel’s latest edits.</p>
        ) : (
          <ul className={rowClass}>
            {recent.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-sm">
                <span className="text-[var(--tfmc-cream)]">{entry.actor_name ?? "Someone"}</span>
                <span className="text-[var(--tfmc-mist)]">{teamAction(entry)}</span>
                <span className="ml-auto text-xs text-[var(--tfmc-stone)]">{formatInstant(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminColumn>
  );
}
