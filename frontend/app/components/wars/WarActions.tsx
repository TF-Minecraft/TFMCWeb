"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { primaryButtonClass, quietButtonClass } from "@/app/components/chronicle/ChroniclePanels";
import { discordSignInUrl } from "@/lib/account/api";
import {
  answerCallToArms,
  answerStatus,
  canAnswer,
  fetchWarMe,
  hasPendingAction,
  leadingOption,
  optionLabel,
  POLL_MS,
  samePicks,
  saveVote,
  startingPicks,
  tallyScale,
  togglePick,
  VOTE_ACTION,
  VOTE_RULE,
  VOTE_TITLE,
  votePanelMode,
  voteStatus,
  type ActionStatusView,
  type OpenCallToArms,
  type VoteOption,
  type WarMe,
} from "@/lib/wars/actions";
import { formatDateTime, SIDE_LABEL, warHref } from "@/lib/wars/format";
import type { WarSide } from "@/lib/wars/types";

import { FactionName, Section, SideLabel, mutedClass, linkClass, sideVar } from "./WarUi";

type Names = Record<WarSide, string>;

const STATUS_TONE: Record<ActionStatusView["tone"], string> = {
  pending: "text-[var(--tfmc-stone)]",
  done: "text-[var(--tfmc-accent)]",
  refused: "text-[#e0a48f]",
};

export function StatusLine({ status }: { status: ActionStatusView | null }) {
  if (!status) return null;
  return (
    <p role="status" className={`text-sm font-medium ${STATUS_TONE[status.tone]}`}>
      {status.tone === "pending" ? (
        <span
          aria-hidden
          className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--tfmc-stone)] align-middle"
        />
      ) : null}
      {status.text}
    </p>
  );
}

function closesText(closesAt: string | null | undefined): string {
  const when = formatDateTime(closesAt);
  return when ? `The vote closes ${when}.` : "";
}

function TallyBars({ attacker, defender, scale }: { attacker: number; defender: number; scale: number }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs tabular-nums text-[var(--tfmc-mist)]" aria-hidden>
      <span className="w-4 text-right">{attacker}</span>
      <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-l-full bg-[color-mix(in_srgb,var(--tfmc-cream)_8%,transparent)]">
        <div
          className="h-full rounded-l-full"
          style={{ width: `${(attacker / scale) * 100}%`, background: sideVar("attacker") }}
        />
      </div>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-r-full bg-[color-mix(in_srgb,var(--tfmc-cream)_8%,transparent)]">
        <div
          className="h-full rounded-r-full"
          style={{ width: `${(defender / scale) * 100}%`, background: sideVar("defender") }}
        />
      </div>
      <span className="w-4">{defender}</span>
    </div>
  );
}

export type VotePanelProps = {
  me: WarMe;
  names: Names;
  picks: VoteOption[];
  onToggle?: (option: VoteOption) => void;
  onSave?: () => void;
  saving?: boolean;
  error?: string | null;
  signInHref?: string | null;
  now?: Date;
};

/** The day or hour vote, for whoever is reading the page. */
export function VotePanel({
  me,
  names,
  picks,
  onToggle,
  onSave,
  saving = false,
  error = null,
  signInHref = null,
  now,
}: VotePanelProps) {
  const mode = votePanelMode(me);
  if (mode === "hidden") return null;
  const vote = me.vote;
  const title = vote ? VOTE_TITLE[vote.kind] : "Your vote";
  const closes = closesText(vote?.closes_at);
  if (mode !== "eligible") {
    return (
      <Section id="vote" eyebrow="The vote" title={title}>
        <p className={`text-sm ${mutedClass}`}>
          {mode === "signed_out" ? (
            <>
              {signInHref ? (
                <a href={signInHref} className={linkClass}>
                  Sign in to vote
                </a>
              ) : (
                "Sign in to vote"
              )}
              .
            </>
          ) : mode === "not_linked" ? (
            <>
              <Link href="/profile" className={linkClass}>
                Link your Minecraft account
              </Link>{" "}
              to vote.
            </>
          ) : (
            "Only members of the warring factions vote."
          )}{" "}
          {closes}
        </p>
      </Section>
    );
  }

  const kind = vote?.kind ?? (me.actions.hour_vote?.status === "pending" ? "hour" : "day");
  const action = me.actions[VOTE_ACTION[kind]];
  const status = voteStatus(action, now);
  const options = vote?.options ?? [];
  const saved = me.picks ?? [];
  const pendingPicks = action?.status === "pending" ? (action.payload.picks ?? []) : null;
  const unchanged = samePicks(picks, pendingPicks ?? saved);
  const leading = leadingOption(me.tally);
  const scale = tallyScale(me.tally);
  const side = me.side;
  return (
    <Section id="vote" eyebrow="The vote" title={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <p className={mutedClass}>
          {side ? (
            <>
              You vote with the {SIDE_LABEL[side].toLowerCase()} ({names[side]}). Pick every{" "}
              {kind === "day" ? "day" : "hour"} you can fight.
            </>
          ) : null}
        </p>
        {closes ? <p className="text-[var(--tfmc-mist)]">{closes}</p> : null}
      </div>
      {vote && options.length ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
            <SideLabel side="attacker" />
            <SideLabel side="defender" />
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Options">
            {options.map((option) => {
              const label = optionLabel(vote, option);
              const on = picks.includes(option);
              const row = me.tally?.find((r) => r.option === option);
              return (
                <li key={String(option)}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={saving}
                    onClick={() => onToggle?.(option)}
                    className={`h-full w-full rounded-[8px] border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)] disabled:cursor-not-allowed ${
                      on
                        ? "border-[var(--tfmc-accent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_18%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] hover:border-[color-mix(in_srgb,var(--tfmc-cream)_30%,transparent)]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--tfmc-cream)]">{label}</span>
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] leading-none ${
                          on
                            ? "border-[var(--tfmc-accent)] bg-[var(--tfmc-accent)] text-[var(--tfmc-forest-deep)]"
                            : "border-[color-mix(in_srgb,var(--tfmc-cream)_35%,transparent)]"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                    </span>
                    {leading === option ? (
                      <span className="mt-1 block text-xs font-medium text-[var(--tfmc-accent)]">Leading</span>
                    ) : null}
                    {row ? <TallyBars attacker={row.attacker} defender={row.defender} scale={scale} /> : null}
                    {row ? (
                      <span className="sr-only">
                        {`. ${SIDE_LABEL.attacker} ${row.attacker}, ${SIDE_LABEL.defender.toLowerCase()} ${row.defender}`}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-[var(--tfmc-mist)]">{VOTE_RULE}</p>
        </>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {vote ? (
          <button type="button" className={primaryButtonClass} disabled={saving || unchanged} onClick={onSave}>
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
        <p className={`text-sm ${mutedClass}`}>
          {saved.length
            ? `Your saved picks: ${vote ? saved.map((o) => optionLabel(vote, o)).join(", ") : saved.join(", ")}.`
            : "You have no saved picks yet."}
        </p>
      </div>
      <div className="mt-2">
        {error ? (
          <p role="alert" className={`text-sm font-medium ${STATUS_TONE.refused}`}>
            {error}
          </p>
        ) : (
          <StatusLine status={status} />
        )}
      </div>
    </Section>
  );
}

export type CallToArmsCardProps = {
  call: OpenCallToArms;
  names: Names;
  onAnswer?: (accept: boolean) => void;
  busy?: boolean;
  error?: string | null;
};

/** An open call to arms, for the leader of the called faction. */
export function CallToArmsCard({ call, names, onAnswer, busy = false, error = null }: CallToArmsCardProps) {
  const status = answerStatus(call.action);
  const answerable = canAnswer(call);
  const side = call.side;
  return (
    <Section
      id={`call-${call.target.id ?? "faction"}`}
      eyebrow="Call to arms"
      title={`${call.target.name} is called to arms`}
    >
      <p className={`text-sm ${mutedClass}`}>
        <FactionName faction={call.caller} className="font-semibold" /> calls on{" "}
        <FactionName faction={call.target} className="font-semibold" /> to join this war
        {side ? (
          <>
            {" "}
            with the {SIDE_LABEL[side].toLowerCase()}, against {names[side === "attacker" ? "defender" : "attacker"]}
          </>
        ) : null}
        .{" "}
        {call.coalition
          ? "They call on you as a fellow member of their coalition. Declining costs more stability than refusing an ally. "
          : ""}
        As its leader, you answer for it, between battles.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {answerable ? (
          <>
            <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => onAnswer?.(true)}>
              Accept
            </button>
            <button type="button" className={quietButtonClass} disabled={busy} onClick={() => onAnswer?.(false)}>
              Decline
            </button>
          </>
        ) : null}
        {error ? (
          <p role="alert" className={`text-sm font-medium ${STATUS_TONE.refused}`}>
            {error}
          </p>
        ) : (
          <StatusLine status={status} />
        )}
      </div>
    </Section>
  );
}

function message(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Something went wrong. Try again.";
}

/**
 * The signed-in player's side of a war page: answering calls to arms and the open
 * vote. Reads `/me` once, and every five seconds while an action is pending.
 */
export default function WarActions({
  mapId,
  warKey,
  names,
  sessionToken,
}: {
  mapId: string;
  warKey: string;
  names: Names;
  sessionToken?: string | null;
}) {
  const [me, setMe] = useState<WarMe | null>(null);
  const [draft, setDraft] = useState<VoteOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [callErrors, setCallErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const next = await fetchWarMe(mapId, warKey, sessionToken);
      setMe(next);
      return next;
    } catch {
      // The war page reads fine without its interactive part.
      return null;
    }
  }, [mapId, warKey, sessionToken]);

  useEffect(() => {
    let current = true;
    fetchWarMe(mapId, warKey, sessionToken)
      .then((next) => {
        if (current) setMe(next);
      })
      // The war page reads fine without its interactive part.
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [mapId, warKey, sessionToken]);

  const pending = hasPendingAction(me);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [pending, load]);

  if (!me) return null;

  const options = me.vote?.options ?? [];
  const picks = draft ?? startingPicks(me);
  let signInHref: string | null = null;
  try {
    signInHref = discordSignInUrl(warHref(mapId, warKey));
  } catch {
    signInHref = null;
  }

  const save = async () => {
    if (!me.vote) return;
    setSaving(true);
    setVoteError(null);
    try {
      await saveVote(mapId, warKey, me.vote.kind, picks, sessionToken);
      setDraft(null);
      await load();
    } catch (err) {
      setVoteError(message(err));
    } finally {
      setSaving(false);
    }
  };

  const answer = async (call: OpenCallToArms, accept: boolean) => {
    const key = call.target.id ?? "";
    setAnswering(key);
    setCallErrors((errors) => {
      const rest = { ...errors };
      delete rest[key];
      return rest;
    });
    try {
      await answerCallToArms(mapId, warKey, key, accept, sessionToken);
      await load();
    } catch (err) {
      setCallErrors((errors) => ({ ...errors, [key]: message(err) }));
    } finally {
      setAnswering(null);
    }
  };

  return (
    <>
      {me.calls_to_arms.map((call) => (
        <CallToArmsCard
          key={call.target.id ?? call.target.name}
          call={call}
          names={names}
          busy={answering === call.target.id}
          error={callErrors[call.target.id ?? ""] ?? null}
          onAnswer={(accept) => void answer(call, accept)}
        />
      ))}
      <VotePanel
        me={me}
        names={names}
        picks={picks}
        saving={saving}
        error={voteError}
        signInHref={signInHref}
        onToggle={(option) => {
          setVoteError(null);
          setDraft(togglePick(picks, option, options));
        }}
        onSave={() => void save()}
      />
    </>
  );
}
