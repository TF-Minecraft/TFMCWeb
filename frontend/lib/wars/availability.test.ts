import { describe, expect, it } from "vitest";

import type { WarAction, WarMe } from "./actions";
import { hasPendingAction, votePanelMode } from "./actions";
import {
  answeredNone,
  availabilityStatus,
  changedDates,
  dateBadge,
  dayLabel,
  hourLabel,
  localHour,
  lockDateTime,
  markBanner,
  nextBattleText,
  ruleText,
  serverInstant,
  startingMarks,
  tallyCell,
  toggleCell,
  toggleDate,
  type AvailabilityDate,
  type AvailabilityVote,
} from "./availability";

const HOURS = [21, 22, 23, 24, 25];

function date(overrides: Partial<AvailabilityDate> = {}): AvailabilityDate {
  return {
    date: "2026-11-21",
    label: "Sat 21/11",
    state: "open",
    day_locks_at: "2026-11-19T20:00:00Z",
    time_locks_at: "2026-11-20T20:00:00Z",
    hour: null,
    editable: true,
    forced: false,
    ...overrides,
  };
}

function vote(overrides: Partial<AvailabilityVote> = {}): AvailabilityVote {
  return {
    kind: "availability",
    closes_at: "2026-11-18T20:00:00Z",
    hours: HOURS,
    hour_labels: ["21:00 CET", "22:00 CET", "23:00 CET", "00:00 CET", "01:00 CET"],
    dates: [
      date({ date: "2026-11-20", label: "Fri 20/11", state: "battle" }),
      date(),
      date({ date: "2026-11-22", label: "Sun 22/11", state: "no_battle", editable: false }),
    ],
    need: { attacker: 3, defender: 3 },
    ...overrides,
  };
}

function action(overrides: Partial<WarAction> = {}): WarAction {
  return {
    id: 1,
    kind: "availability",
    status: "pending",
    reason: null,
    source: "web",
    payload: { date: "2026-11-21", hours: [22] },
    created_at: "2026-11-17T10:00:00Z",
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
    vote: vote(),
    picks: null,
    marks: { "2026-11-20": [21, 22] },
    none: false,
    tally: [{ date: "2026-11-20", hour: 22, attacker: 4, defender: 3 }],
    actions: { call_to_arms_answer: null, day_vote: null, hour_vote: null, availability: null },
    availability_actions: [],
    calls_to_arms: [],
    ...overrides,
  };
}

describe("server time", () => {
  it("turns battle-day hours into instants, past midnight and across the clock change", () => {
    expect(serverInstant("2026-11-20", 21)?.toISOString()).toBe("2026-11-20T20:00:00.000Z");
    expect(serverInstant("2026-11-20", 24)?.toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(serverInstant("2026-11-20", 25)?.toISOString()).toBe("2026-11-21T00:00:00.000Z");
    expect(serverInstant("2026-07-10", 21)?.toISOString()).toBe("2026-07-10T19:00:00.000Z");
    // Summer time ends on 25/10/2026 at 03:00: the evening of the 24th is still CEST.
    expect(serverInstant("2026-10-24", 25)?.toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(serverInstant("soon", 21)).toBeNull();
  });

  it("shows the viewer's own time only when it differs", () => {
    expect(localHour("2026-11-20", 22, "Europe/London")).toBe("21:00");
    expect(localHour("2026-11-20", 25, "America/New_York")).toBe("19:00");
    expect(localHour("2026-11-20", 22, "Europe/Paris")).toBe("");
    expect(localHour("2026-11-20", 22, "Europe/Berlin")).toBe("");
  });

  it("labels days, hours and locks", () => {
    expect(dayLabel("2026-11-20")).toBe("Fri 20 Nov");
    expect(hourLabel(vote(), 24)).toBe("00:00 CET");
    expect(hourLabel(vote({ hour_labels: [] }), 25)).toBe("01:00 CET");
    expect(lockDateTime("2026-11-18T20:00:00Z")).toBe("Wed 18 Nov, 21:00 CET");
    expect(lockDateTime(null)).toBe("");
  });
});

describe("marks", () => {
  it("toggles cells and whole days, in hour order", () => {
    expect(toggleCell({}, "2026-11-21", 24, HOURS)).toEqual({ "2026-11-21": [24] });
    expect(toggleCell({ "2026-11-21": [24] }, "2026-11-21", 21, HOURS)).toEqual({ "2026-11-21": [21, 24] });
    expect(toggleCell({ "2026-11-21": [24] }, "2026-11-21", 24, HOURS)).toEqual({});
    expect(toggleDate({ "2026-11-21": [22] }, "2026-11-21", HOURS)).toEqual({ "2026-11-21": HOURS });
    expect(toggleDate({ "2026-11-21": HOURS }, "2026-11-21", HOURS)).toEqual({});
  });

  it("finds the editable dates that changed", () => {
    const dates = vote().dates!;
    const base = { "2026-11-20": [21, 22], "2026-11-22": [21] };
    expect(changedDates({ "2026-11-20": [22, 21] }, base, dates)).toEqual([]);
    expect(changedDates({ "2026-11-21": [23] }, base, dates)).toEqual(["2026-11-20", "2026-11-21"]);
  });

  it("starts from the saved marks with what is still waiting for the server on top", () => {
    expect(startingMarks(me())).toEqual({ "2026-11-20": [21, 22] });
    const pending = [
      action({ id: 2, payload: { date: "2026-11-21", hours: [25, 22] } }),
      action({ id: 3, payload: { date: "2026-11-20", hours: [] } }),
      action({ id: 1, status: "rejected", payload: { date: "2026-11-22", hours: [21] } }),
    ];
    expect(startingMarks(me({ availability_actions: pending }))).toEqual({ "2026-11-21": [22, 25] });
    const none = [action({ payload: { none: true } })];
    expect(startingMarks(me({ availability_actions: none }))).toEqual({});
    expect(answeredNone(me({ availability_actions: none }), {})).toBe(true);
    expect(answeredNone(me({ none: true }), { "2026-11-21": [21] })).toBe(false);
  });

  it("reads one cell of the tally", () => {
    expect(tallyCell(me().tally as never, "2026-11-20", 22)).toEqual({
      date: "2026-11-20",
      hour: 22,
      attacker: 4,
      defender: 3,
    });
    expect(tallyCell(null, "2026-11-20", 22)).toBeNull();
  });
});

describe("words", () => {
  it("badges each date by its state", () => {
    expect(dateBadge(date({ state: "battle" }))).toEqual({ tone: "gold", text: "Battle day — time locks Fri 21:00" });
    expect(dateBadge(date({ state: "battle", hour: 24 }))).toEqual({ tone: "gold", text: "Battle at 00:00 CET" });
    expect(dateBadge(date({ state: "no_battle" }))).toEqual({ tone: "grey", text: "No battle" });
    expect(dateBadge(date())).toEqual({ tone: "open", text: "Open — decided Thu 21:00" });
  });

  it("states the rule with the sizes the plugin needs", () => {
    expect(ruleText({ attacker: 3, defender: 3 })).toBe(
      "A day becomes a battle when 3 of each side can come at the same time. It's decided 2 days before; the time is decided 1 day before.",
    );
    expect(ruleText({ attacker: 3, defender: 1 })).toContain("when 3 attackers and 1 defender can come");
  });

  it("names the next battle in server and local time", () => {
    const now = new Date("2026-11-17T10:00:00Z");
    expect(nextBattleText(vote(), now)).toBeNull();
    const set = vote({ dates: [date({ date: "2026-11-20", state: "battle", hour: 22 })] });
    expect(nextBattleText(set, now, "Europe/London")).toBe("⚔ Next battle: Fri 20 Nov, 22:00 CET (21:00 your time)");
    expect(nextBattleText(set, now, "Europe/Paris")).toBe("⚔ Next battle: Fri 20 Nov, 22:00 CET");
    expect(nextBattleText(set, new Date("2026-11-21T10:00:00Z"))).toBeNull();
  });

  it("tells the user whether they marked anything", () => {
    expect(markBanner(vote(), {}, false)).toEqual({ tone: "red", text: "You haven't marked anything" });
    expect(markBanner(vote(), { "2026-11-21": [21] }, false)).toEqual({
      tone: "green",
      text: "✔ Marked — you can change it until each day is decided (next: Wed 18 Nov, 21:00 CET).",
    });
    expect(markBanner(vote(), {}, true).tone).toBe("grey");
  });
});

describe("statuses", () => {
  const now = new Date("2026-11-17T10:00:10Z");

  it("waits, then names the refused day or says Saved", () => {
    expect(availabilityStatus([], vote(), now)).toBeNull();
    expect(availabilityStatus([action()], vote(), now)?.text).toBe("Waiting for the server…");
    const applied = action({ id: 1, status: "applied", applied_at: "2026-11-17T10:00:05Z" });
    expect(availabilityStatus([applied], vote(), now)).toEqual({ tone: "done", text: "Saved" });
    const refused = action({ id: 2, status: "rejected", reason: "That day is already decided." });
    expect(availabilityStatus([applied, refused], vote(), now)).toEqual({
      tone: "refused",
      text: "Sat 21/11: That day is already decided.",
    });
    const old = action({ status: "applied", applied_at: "2026-11-15T10:00:00Z" });
    expect(availabilityStatus([old], vote(), now)).toBeNull();
  });

  it("shows the grid to eligible users and polls while a change is pending", () => {
    expect(votePanelMode(me())).toBe("eligible");
    expect(votePanelMode(me({ eligible: false, vote: { kind: "availability", closes_at: null } }))).toBe("ineligible");
    expect(votePanelMode(me({ vote: null }))).toBe("hidden");
    expect(votePanelMode(me({ vote: null, availability_actions: [action()] }))).toBe("eligible");
    expect(hasPendingAction(me({ availability_actions: [action()] }))).toBe(true);
    expect(hasPendingAction(me())).toBe(false);
  });
});
