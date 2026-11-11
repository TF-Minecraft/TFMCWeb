/**
 * Acting on a war page (contract v1.3): the signed-in player's vote and their
 * answers to calls to arms. Shapes as `backend/src/wars/actions.py` returns them;
 * routes in `docs/docs/map/war-history.md#war-actions`.
 *
 * Every action is queued on the website and applied by SimpleFactions, which
 * re-checks it with the in-game rules; the page shows "Waiting for the server…"
 * until the plugin answers, then "Saved" or the reason it was refused.
 *
 * Contract v1.4 replaces the day and hour votes with battle availability (a grid of
 * dates and start hours, `./availability.ts`); `vote.kind` says which one a war uses.
 */

import { detailMessage, getApiBase, parseJson } from "@/lib/site/api";

import type { FactionRef, WarSide } from "./types";
import { warPath } from "./api";
import type { AvailabilityTallyRow, AvailabilityVote, Marks } from "./availability";

export type VoteKind = "day" | "hour";

/** A day vote's options are `YYYY-MM-DD`; an hour vote's are schedule hours as in game. */
export type VoteOption = string | number;

export type WarActionKind = "call_to_arms_answer" | "day_vote" | "hour_vote" | "availability";

export type WarActionStatus = "pending" | "applied" | "rejected" | "expired";

export type WarAction = {
  id: number;
  kind: WarActionKind;
  status: WarActionStatus;
  reason: string | null;
  /** The same action may work on a later try (a battle being fought, a server failure, an expiry). */
  retry?: boolean;
  source: "web" | "discord";
  payload: {
    picks?: VoteOption[];
    target_faction_id?: string;
    accept?: boolean;
    /** Availability: the date whose marks this replaces, or `none`. */
    date?: string;
    hours?: number[];
    none?: boolean;
  };
  created_at: string | null;
  applied_at: string | null;
};

export type TallyRow = { option: VoteOption; attacker: number; defender: number };

export type OpenVote = {
  kind: VoteKind;
  closes_at: string | null;
  /** Only for eligible users. */
  options?: VoteOption[];
  option_labels?: string[];
};

export type OpenCallToArms = {
  caller: FactionRef | null;
  target: FactionRef;
  side: WarSide | null;
  coalition: boolean;
  action: WarAction | null;
};

export type WarMe = {
  signed_in: boolean;
  linked: boolean;
  eligible: boolean;
  side: WarSide | null;
  vote: OpenVote | AvailabilityVote | null;
  picks: VoteOption[] | null;
  /** Availability: the user's own marks (eligible users only). */
  marks?: Marks | null;
  /** Availability: the user said none of the shown days work. */
  none?: boolean | null;
  tally: TallyRow[] | AvailabilityTallyRow[] | null;
  actions: Partial<Record<WarActionKind, WarAction | null>>;
  /** Availability: the user's latest change per shown date, and their latest "none" answer. */
  availability_actions?: WarAction[];
  calls_to_arms: OpenCallToArms[];
};

/** The day or hour vote of v1.3, or null (no vote, or an availability grid). */
export function legacyVote(me: WarMe | null): OpenVote | null {
  return me?.vote && me.vote.kind !== "availability" ? me.vote : null;
}

/** The tally of a day or hour vote. */
export function legacyTally(me: WarMe): TallyRow[] | null {
  return legacyVote(me) ? (me.tally as TallyRow[] | null) : null;
}

export const VOTE_ACTION: Record<VoteKind, WarActionKind> = { day: "day_vote", hour: "hour_vote" };

export const POLL_MS = 5000;

/** The in-game rule, as the campaign view words it. */
export const VOTE_RULE = "The battle goes to the option both sides can best make; ties go to the earlier one.";

export const VOTE_TITLE: Record<VoteKind, string> = {
  day: "Vote on the first battle day",
  hour: "Vote on the battle hour",
};

// --- the API ---------------------------------------------------------------------------

export class WarActionApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WarActionApiError";
    this.status = status;
  }
}

/** The session is an HttpOnly cookie; a staff-only map also takes the profile session token. */
async function request<T>(path: string, sessionToken: string | null | undefined, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const res = await fetch(`${getApiBase()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new WarActionApiError(errorMessage(data, res.status), res.status);
  if (data === null) throw new WarActionApiError("Unexpected empty response", res.status);
  return data as T;
}

const ERROR_WORDS: Record<string, string> = {
  not_signed_in: "Sign in to vote.",
  minecraft_not_linked: "Link your Minecraft account on your profile first.",
  bad_origin: "The request was refused. Reload the page and try again.",
  cross_site_request: "The request was refused. Reload the page and try again.",
  discord_auth_disabled: "Sign-in is not available on this site.",
};

export function errorMessage(data: unknown, status: number): string {
  const message = detailMessage(data, `Request failed (${status})`);
  return ERROR_WORDS[message] ?? message;
}

export function fetchWarMe(mapId: string, warKey: string, sessionToken?: string | null): Promise<WarMe> {
  return request<WarMe>(`${warPath(mapId, warKey)}/me`, sessionToken);
}

export async function saveVote(
  mapId: string,
  warKey: string,
  kind: VoteKind,
  picks: VoteOption[],
  sessionToken?: string | null,
): Promise<WarAction> {
  const reply = await request<{ action: WarAction }>(`${warPath(mapId, warKey)}/vote`, sessionToken, { kind, picks });
  return reply.action;
}

/** One availability change: a date's start hours (`[]` clears them), or "none of these days work". */
export type AvailabilityChange = { date: string; hours: number[] } | { none: true };

export async function saveAvailability(
  mapId: string,
  warKey: string,
  change: AvailabilityChange,
  sessionToken?: string | null,
): Promise<WarAction> {
  const reply = await request<{ action: WarAction }>(`${warPath(mapId, warKey)}/availability`, sessionToken, change);
  return reply.action;
}

export async function answerCallToArms(
  mapId: string,
  warKey: string,
  targetFactionId: string,
  accept: boolean,
  sessionToken?: string | null,
): Promise<WarAction> {
  const reply = await request<{ action: WarAction }>(`${warPath(mapId, warKey)}/call-to-arms`, sessionToken, {
    target_faction_id: targetFactionId,
    accept,
  });
  return reply.action;
}

// --- panel logic -------------------------------------------------------------------------

export type VotePanelMode = "hidden" | "signed_out" | "not_linked" | "ineligible" | "eligible";

/** What the vote panel shows: nothing without an open vote (or a pending vote of the user). */
export function votePanelMode(me: WarMe | null): VotePanelMode {
  if (!me) return "hidden";
  const pendingVote = [me.actions.day_vote, me.actions.hour_vote].some((a) => a?.status === "pending");
  const pendingMarks = (me.availability_actions ?? []).some((a) => a.status === "pending");
  if (!me.vote && !pendingVote && !pendingMarks) return "hidden";
  if (!me.signed_in) return "signed_out";
  if (!me.linked) return "not_linked";
  if (!me.eligible) return "ineligible";
  if (me.vote?.kind === "availability") return me.vote.dates?.length ? "eligible" : "ineligible";
  return legacyVote(me)?.options?.length || pendingVote || pendingMarks ? "eligible" : "ineligible";
}

/** Whether `/me` should be polled: an action of the user is still waiting for the server. */
export function hasPendingAction(me: WarMe | null): boolean {
  if (!me) return false;
  if (Object.values(me.actions).some((a) => a?.status === "pending")) return true;
  if ((me.availability_actions ?? []).some((a) => a.status === "pending")) return true;
  return me.calls_to_arms.some((call) => call.action?.status === "pending");
}

export type StatusTone = "pending" | "done" | "refused";

export type ActionStatusView = { tone: StatusTone; text: string };

/** A finished vote's "Saved" or refusal stays this long, so yesterday's hour vote is not shown today. */
export const RESOLVED_STATUS_MS = 12 * 60 * 60 * 1000;

/** The status line of a vote action, or null when there is nothing to say. */
export function voteStatus(action: WarAction | null, now: Date = new Date()): ActionStatusView | null {
  if (!action) return null;
  if (action.status === "pending") return { tone: "pending", text: "Waiting for the server…" };
  const at = Date.parse(action.applied_at ?? action.created_at ?? "");
  if (Number.isFinite(at) && now.getTime() - at > RESOLVED_STATUS_MS) return null;
  if (action.status === "applied") return { tone: "done", text: "Saved" };
  if (action.status === "expired") return { tone: "refused", text: action.reason || "The server did not answer." };
  return { tone: "refused", text: action.reason || "The server refused this vote." };
}

/** The status line of a call to arms answer. */
export function answerStatus(action: WarAction | null): ActionStatusView | null {
  if (!action) return null;
  if (action.status === "pending") return { tone: "pending", text: "Waiting for the server…" };
  if (action.status === "applied") return { tone: "done", text: action.payload.accept ? "Accepted" : "Declined" };
  if (action.status === "expired") return { tone: "refused", text: action.reason || "The server did not answer." };
  return { tone: "refused", text: action.reason || "The server refused this answer." };
}

/** Toggle one option; picks stay in the vote's option order. */
export function togglePick(picks: readonly VoteOption[], option: VoteOption, options: readonly VoteOption[]) {
  const next = picks.includes(option) ? picks.filter((p) => p !== option) : [...picks, option];
  return options.filter((o) => next.includes(o));
}

export function samePicks(a: readonly VoteOption[], b: readonly VoteOption[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/**
 * The picks the panel starts from: a pending vote's picks (what the user last
 * sent), else the saved ones.
 */
export function startingPicks(me: WarMe): VoteOption[] {
  const vote = legacyVote(me);
  const kind = vote?.kind;
  const options = vote?.options ?? [];
  const pending = kind ? me.actions[VOTE_ACTION[kind]] : null;
  const source = pending?.status === "pending" && pending.payload.picks ? pending.payload.picks : (me.picks ?? []);
  return options.filter((o) => source.includes(o));
}

/** The option label, or the option itself. */
export function optionLabel(vote: OpenVote, option: VoteOption): string {
  const index = vote.options?.indexOf(option) ?? -1;
  return (index >= 0 && vote.option_labels?.[index]) || String(option);
}

function isEarlier(a: VoteOption, b: VoteOption): boolean {
  return typeof a === "number" && typeof b === "number" ? a < b : String(a) < String(b);
}

/**
 * The option the vote would pick now, as SimpleFactions does (`BattleVoteService.pickBest`):
 * the highest `min(attackers, defenders)`, ties to the earlier option; null while no
 * option has a vote from each side.
 */
export function leadingOption(tally: readonly TallyRow[] | null | undefined): VoteOption | null {
  let best: VoteOption | null = null;
  let bestScore = 0;
  for (const row of tally ?? []) {
    const score = Math.min(row.attacker, row.defender);
    if (score <= 0) continue;
    if (score > bestScore || (score === bestScore && best !== null && isEarlier(row.option, best))) {
      best = row.option;
      bestScore = score;
    }
  }
  return best;
}

/** The widest side count of any option, for scaling the tally bars (at least 1). */
export function tallyScale(tally: readonly TallyRow[] | null | undefined): number {
  return Math.max(1, ...(tally ?? []).map((row) => Math.max(row.attacker, row.defender)));
}

/** Whether a call's Accept and Decline buttons are offered. */
export function canAnswer(call: OpenCallToArms): boolean {
  const status = call.action?.status;
  return status !== "pending" && status !== "applied";
}
