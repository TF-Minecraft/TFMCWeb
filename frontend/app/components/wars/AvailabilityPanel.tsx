"use client";

import Link from "next/link";

import { primaryButtonClass, quietButtonClass } from "@/app/components/chronicle/ChroniclePanels";
import { votePanelMode, type WarMe } from "@/lib/wars/actions";
import {
  answeredNone,
  availabilityStatus,
  availabilityVote,
  dateBadge,
  hourLabel,
  localHour,
  markBanner,
  nextBattleText,
  ruleText,
  tallyCell,
  toggleCell,
  toggleDate,
  type AvailabilityTallyRow,
  type Banner,
  type DateBadge,
  type Marks,
} from "@/lib/wars/availability";
import { SIDE_LABEL } from "@/lib/wars/format";
import type { WarSide } from "@/lib/wars/types";

import { STATUS_TONE, StatusLine } from "./ActionStatus";
import { Section, linkClass, mutedClass } from "./WarUi";

const GOLD = "#d9b44a";

const BANNER_CLASS: Record<Banner["tone"], string> = {
  red: "border-[#e0a48f] bg-[color-mix(in_srgb,#e0a48f_14%,transparent)] text-[#f0c4b4]",
  green:
    "border-[var(--tfmc-accent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_16%,transparent)] text-[var(--tfmc-cream)]",
  grey: "border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] text-[var(--tfmc-stone)]",
};

const BADGE_CLASS: Record<DateBadge["tone"], string> = {
  gold: "",
  grey: "text-[var(--tfmc-mist)]",
  open: "text-[var(--tfmc-mist)]",
};

export type AvailabilityPanelProps = {
  me: WarMe;
  names: Record<WarSide, string>;
  /** The marks shown: the user's draft, or what they saved or last sent. */
  marks: Marks;
  /** The draft differs from what was saved. */
  dirty?: boolean;
  onChange?: (marks: Marks) => void;
  onSave?: () => void;
  onNone?: () => void;
  saving?: boolean;
  error?: string | null;
  signInHref?: string | null;
  now?: Date;
  /** The viewer's time zone; the browser's by default. */
  timeZone?: string;
};

/** "When can you fight?": a grid of dates and start times, each cell a toggle. */
export default function AvailabilityPanel({
  me,
  names,
  marks,
  dirty = false,
  onChange,
  onSave,
  onNone,
  saving = false,
  error = null,
  signInHref = null,
  now,
  timeZone,
}: AvailabilityPanelProps) {
  const mode = votePanelMode(me);
  if (mode === "hidden") return null;
  const vote = availabilityVote(me);
  const title = "When can you fight?";
  if (mode === "eligible" && !vote) {
    return (
      <Section id="availability" eyebrow="Battle days" title={title}>
        <p className={`text-sm ${mutedClass}`}>There are no days to mark right now.</p>
        <div className="mt-2">
          <StatusLine status={availabilityStatus(me.availability_actions, null, now)} />
        </div>
      </Section>
    );
  }
  if (mode !== "eligible" || !vote) {
    return (
      <Section id="availability" eyebrow="Battle days" title={title}>
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
          )}
        </p>
      </Section>
    );
  }

  const hours = vote.hours ?? [];
  const dates = vote.dates ?? [];
  const tally = me.tally as AvailabilityTallyRow[] | null;
  const none = answeredNone(me, marks);
  const banner = markBanner(vote, marks, none);
  const battle = nextBattleText(vote, now, timeZone);
  const status = availabilityStatus(me.availability_actions, vote, now);
  const side = me.side;
  const firstDate = dates[0]?.date ?? "";

  return (
    <Section id="availability" eyebrow="Battle days" title={title}>
      {battle ? (
        <p
          className="mb-3 rounded-[8px] border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: GOLD, color: GOLD, background: `color-mix(in srgb, ${GOLD} 12%, transparent)` }}
        >
          {battle}
        </p>
      ) : null}
      <p className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${BANNER_CLASS[banner.tone]}`}>
        {banner.text}
      </p>
      <p className={`mt-3 text-sm ${mutedClass}`}>
        {side ? `You mark for the ${SIDE_LABEL[side].toLowerCase()} (${names[side]}). ` : ""}
        Click every start time you could fight. Click a day to mark all its times.
      </p>

      <div
        className="mt-4 flex flex-col gap-3 sm:grid sm:grid-flow-col sm:gap-1.5"
        style={{
          gridTemplateColumns: `auto repeat(${dates.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${hours.length + 1}, auto)`,
        }}
      >
        <div className="hidden sm:contents" aria-hidden>
          <div />
          {hours.map((hour) => {
            const local = localHour(firstDate, hour, timeZone);
            return (
              <div key={hour} className="flex flex-col justify-center pr-2 text-xs tabular-nums">
                <span className="font-semibold text-[var(--tfmc-cream)]">{hourLabel(vote, hour)}</span>
                {local ? <span className="text-[var(--tfmc-mist)]">{local} your time</span> : null}
              </div>
            );
          })}
        </div>
        {dates.map((date) => {
          const badge = dateBadge(date);
          const editable = date.editable && !saving;
          const own = marks[date.date] ?? [];
          return (
            <div
              key={date.date}
              role="group"
              aria-label={date.label}
              className="flex flex-wrap items-stretch gap-1.5 sm:contents"
            >
              <button
                type="button"
                disabled={!editable}
                onClick={() => onChange?.(toggleDate(marks, date.date, hours))}
                aria-label={`${date.label}: ${badge.text}. Mark every time on this day`}
                className="flex w-full flex-col items-start rounded-[8px] px-1 py-1 text-left transition enabled:hover:bg-[color-mix(in_srgb,var(--tfmc-cream)_6%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--tfmc-accent)] disabled:cursor-default sm:items-center sm:text-center"
              >
                <span className="font-semibold text-[var(--tfmc-cream)]">{date.label}</span>
                <span
                  className={`text-[11px] leading-tight ${BADGE_CLASS[badge.tone]}`}
                  style={badge.tone === "gold" ? { color: GOLD } : undefined}
                >
                  {badge.text}
                </span>
              </button>
              {hours.map((hour) => {
                const on = own.includes(hour);
                const chosen = date.state === "battle" && date.hour === hour;
                const count = tallyCell(tally, date.date, hour);
                const label = hourLabel(vote, hour);
                const local = localHour(date.date, hour, timeZone);
                return (
                  <button
                    key={hour}
                    type="button"
                    aria-pressed={on}
                    disabled={!editable}
                    onClick={() => onChange?.(toggleCell(marks, date.date, hour, hours))}
                    aria-label={`${date.label}, ${label}${local ? ` (${local} your time)` : ""}${
                      count ? `. Attackers ${count.attacker}, defenders ${count.defender}` : ""
                    }${chosen ? ". The battle starts at this time" : ""}`}
                    className={`flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center rounded-[8px] border px-2 py-1 text-xs tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tfmc-accent)] disabled:cursor-not-allowed sm:min-w-0 ${
                      on
                        ? "border-[var(--tfmc-accent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_30%,transparent)] text-[var(--tfmc-cream)]"
                        : date.state === "no_battle"
                          ? "border-transparent bg-[color-mix(in_srgb,var(--tfmc-cream)_4%,transparent)] text-[var(--tfmc-mist)] opacity-60"
                          : "border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_55%,transparent)] text-[var(--tfmc-mist)] enabled:hover:border-[color-mix(in_srgb,var(--tfmc-cream)_30%,transparent)]"
                    }`}
                    style={chosen ? { borderColor: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}` } : undefined}
                  >
                    <span className="font-semibold sm:hidden">{label.replace(/ CET$/, "")}</span>
                    <span aria-hidden className="hidden font-semibold sm:inline">
                      {on ? "✓" : " "}
                    </span>
                    {count ? (
                      <span aria-hidden className="whitespace-nowrap">
                        A {count.attacker} · D {count.defender}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[var(--tfmc-mist)]">{ruleText(vote.need)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" className={primaryButtonClass} disabled={saving || !dirty} onClick={onSave}>
          {saving ? "Saving…" : "Save my times"}
        </button>
        <button
          type="button"
          className={quietButtonClass}
          aria-pressed={none}
          disabled={saving || none}
          onClick={onNone}
        >
          None of these days work for me
        </button>
        {dirty ? <p className="text-sm font-medium text-[var(--tfmc-cream)]">You have unsaved changes.</p> : null}
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
