import { describe, expect, it } from "vitest";

import {
  answerStatus,
  canAnswer,
  errorMessage,
  hasPendingAction,
  leadingOption,
  optionLabel,
  samePicks,
  startingPicks,
  tallyScale,
  togglePick,
  votePanelMode,
  voteStatus,
  type WarAction,
  type WarMe,
} from "./actions";

const DAYS = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"];

function action(overrides: Partial<WarAction> = {}): WarAction {
  return {
    id: 1,
    kind: "day_vote",
    status: "pending",
    reason: null,
    source: "web",
    payload: { picks: ["2026-11-19"] },
    created_at: "2026-11-10T10:00:00Z",
    applied_at: null,
    ...overrides,
  };
}

function me(overrides: Partial<WarMe> = {}): WarMe {
  return {
    signed_in: true,
    linked: true,
    eligible: true,
    side: "attacker",
    vote: {
      kind: "day",
      closes_at: "2026-11-13T09:50:00Z",
      options: DAYS,
      option_labels: ["Tue 17/11", "Wed 18/11", "Thu 19/11", "Fri 20/11", "Sat 21/11"],
    },
    picks: ["2026-11-18"],
    tally: DAYS.map((option, i) => ({ option, attacker: i === 1 ? 2 : 0, defender: i === 1 || i === 2 ? 1 : 0 })),
    actions: { call_to_arms_answer: null, day_vote: null, hour_vote: null },
    calls_to_arms: [],
    ...overrides,
  };
}

describe("votePanelMode", () => {
  it("hides the panel when no vote is open", () => {
    expect(votePanelMode(null)).toBe("hidden");
    expect(votePanelMode(me({ vote: null }))).toBe("hidden");
  });

  it("asks signed-out and unlinked users to sign in or link", () => {
    const vote = { kind: "day" as const, closes_at: null };
    expect(votePanelMode(me({ signed_in: false, linked: false, eligible: false, vote }))).toBe("signed_out");
    expect(votePanelMode(me({ linked: false, eligible: false, vote }))).toBe("not_linked");
    expect(votePanelMode(me({ eligible: false, vote, tally: null }))).toBe("ineligible");
  });

  it("shows the toggles to eligible users, and a pending vote after the vote closed", () => {
    expect(votePanelMode(me())).toBe("eligible");
    const pending = me({ vote: null, actions: { call_to_arms_answer: null, day_vote: action(), hour_vote: null } });
    expect(votePanelMode(pending)).toBe("eligible");
  });
});

describe("statuses", () => {
  const now = new Date("2026-11-10T10:00:10Z");

  it("waits, then says Saved or why it was refused", () => {
    expect(voteStatus(null)).toBeNull();
    expect(voteStatus(action(), now)).toEqual({ tone: "pending", text: "Waiting for the server…" });
    expect(voteStatus(action({ status: "applied", applied_at: "2026-11-10T10:00:05Z" }), now)).toEqual({
      tone: "done",
      text: "Saved",
    });
    expect(voteStatus(action({ status: "rejected", reason: "The day vote has closed." }), now)).toEqual({
      tone: "refused",
      text: "The day vote has closed.",
    });
    expect(voteStatus(action({ status: "expired", reason: "The server did not answer in time." }), now)?.tone).toBe(
      "refused",
    );
  });

  it("forgets a finished vote after half a day, so an old hour vote is not shown", () => {
    const old = action({ status: "applied", applied_at: "2026-11-09T09:00:00Z" });
    expect(voteStatus(old, now)).toBeNull();
    expect(voteStatus(action({ created_at: "2026-11-01T00:00:00Z" }), now)?.tone).toBe("pending");
  });

  it("says Accepted or Declined for an applied answer", () => {
    const answer = action({ kind: "call_to_arms_answer", payload: { target_faction_id: "x", accept: true } });
    expect(answerStatus(answer)?.text).toBe("Waiting for the server…");
    expect(answerStatus({ ...answer, status: "applied" })?.text).toBe("Accepted");
    expect(answerStatus({ ...answer, status: "applied", payload: { accept: false } })?.text).toBe("Declined");
    expect(answerStatus({ ...answer, status: "rejected", reason: "You no longer lead that faction." })).toEqual({
      tone: "refused",
      text: "You no longer lead that faction.",
    });
  });

  it("offers Accept and Decline again only after a refusal", () => {
    const call = { caller: null, target: { id: "x", founded_at: null, name: "X", name_raw: "X", rgb: null } };
    const base = { ...call, side: "attacker" as const, coalition: false };
    expect(canAnswer({ ...base, action: null })).toBe(true);
    expect(canAnswer({ ...base, action: action() })).toBe(false);
    expect(canAnswer({ ...base, action: action({ status: "applied" }) })).toBe(false);
    expect(canAnswer({ ...base, action: action({ status: "rejected" }) })).toBe(true);
    expect(canAnswer({ ...base, action: action({ status: "expired" }) })).toBe(true);
  });

  it("polls while any action is pending", () => {
    expect(hasPendingAction(me())).toBe(false);
    expect(hasPendingAction(me({ actions: { call_to_arms_answer: null, day_vote: action(), hour_vote: null } }))).toBe(
      true,
    );
    const call = {
      caller: null,
      target: { id: "x", founded_at: null, name: "X", name_raw: "X", rgb: null },
      side: null,
      coalition: false,
      action: action({ kind: "call_to_arms_answer" }),
    };
    expect(hasPendingAction(me({ calls_to_arms: [call] }))).toBe(true);
  });
});

describe("picks", () => {
  it("toggles in option order and compares as sets", () => {
    expect(togglePick(["2026-11-20"], "2026-11-17", DAYS)).toEqual(["2026-11-17", "2026-11-20"]);
    expect(togglePick(["2026-11-17", "2026-11-20"], "2026-11-17", DAYS)).toEqual(["2026-11-20"]);
    expect(togglePick([21], 22, [20, 21, 22])).toEqual([21, 22]);
    expect(samePicks(["a", "b"], ["b", "a"])).toBe(true);
    expect(samePicks(["a"], ["a", "b"])).toBe(false);
  });

  it("starts from a pending vote's picks, else the saved ones", () => {
    expect(startingPicks(me())).toEqual(["2026-11-18"]);
    const pending = action({ payload: { picks: ["2026-11-21", "2026-11-17"] } });
    expect(startingPicks(me({ actions: { call_to_arms_answer: null, day_vote: pending, hour_vote: null } }))).toEqual([
      "2026-11-17",
      "2026-11-21",
    ]);
  });

  it("labels options, falling back to the option", () => {
    const vote = { kind: "hour" as const, closes_at: null, options: [21, 22], option_labels: ["21:00 CET"] };
    expect(optionLabel(vote, 21)).toBe("21:00 CET");
    expect(optionLabel(vote, 22)).toBe("22");
  });
});

describe("leadingOption", () => {
  it("picks the option both sides can best make, ties to the earlier one", () => {
    expect(leadingOption(me().tally)).toBe("2026-11-18");
    expect(
      leadingOption([
        { option: 22, attacker: 3, defender: 1 },
        { option: 21, attacker: 1, defender: 1 },
        { option: 23, attacker: 2, defender: 2 },
      ]),
    ).toBe(23);
    expect(
      leadingOption([
        { option: 22, attacker: 1, defender: 1 },
        { option: 21, attacker: 1, defender: 1 },
      ]),
    ).toBe(21);
  });

  it("has no leader until an option has a vote from each side", () => {
    expect(leadingOption([{ option: 21, attacker: 4, defender: 0 }])).toBeNull();
    expect(leadingOption(null)).toBeNull();
  });

  it("scales the bars to the biggest count", () => {
    expect(tallyScale(me().tally)).toBe(2);
    expect(tallyScale([])).toBe(1);
  });
});

describe("errorMessage", () => {
  it("words the API's codes for players", () => {
    expect(errorMessage({ detail: "minecraft_not_linked" }, 409)).toBe(
      "Link your Minecraft account on your profile first.",
    );
    expect(errorMessage({ detail: "This vote is closed." }, 409)).toBe("This vote is closed.");
    expect(errorMessage(null, 500)).toBe("Request failed (500)");
  });
});
