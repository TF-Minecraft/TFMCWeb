import { describe, expect, it } from "vitest";

import { formatDay } from "./dates";
import { eventProblem, eventWhen, moveItem, sameOrder, sortByDate } from "./eventPlan";

describe("moveItem", () => {
  it("moves an item up and down", () => {
    expect(moveItem([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });

  it("leaves the list alone at the ends or out of range", () => {
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 5, -1)).toEqual([1, 2, 3]);
    expect(moveItem([], 0, 1)).toEqual([]);
  });

  it("does not change the input", () => {
    const list = [1, 2, 3];
    moveItem(list, 0, 1);
    expect(list).toEqual([1, 2, 3]);
  });
});

describe("sortByDate", () => {
  const ev = (id: number, scheduled_on: string | null, starts_at: string | null = null) => ({
    id,
    scheduled_on,
    starts_at,
  });

  it("orders by day, then start time, undated last in their current order", () => {
    const events = [
      ev(1, null),
      ev(2, "2026-12-01"),
      ev(3, "2026-11-20", "2026-11-20T19:00:00Z"),
      ev(4, null),
      ev(5, "2026-11-20", "2026-11-20T08:00:00+00:00"),
      ev(6, "2026-11-20"),
    ];
    expect(sortByDate(events)).toEqual([5, 3, 6, 2, 1, 4]);
  });

  it("keeps equal events in place", () => {
    expect(sortByDate([ev(3, "2026-11-20"), ev(1, "2026-11-20")])).toEqual([3, 1]);
  });
});

describe("sameOrder", () => {
  it("compares id lists", () => {
    expect(sameOrder([1, 2], [1, 2])).toBe(true);
    expect(sameOrder([1, 2], [2, 1])).toBe(false);
    expect(sameOrder([1], [1, 2])).toBe(false);
  });
});

describe("eventWhen", () => {
  const base = { status: "idea", scheduled_on: null, starts_at: null, waiting_on: "" };

  it("shows the day and the start time in the given zone", () => {
    expect(eventWhen({ ...base, status: "scheduled", scheduled_on: "2026-11-20" }, "UTC")).toBe(
      formatDay("2026-11-20", { year: true }),
    );
    expect(
      eventWhen(
        { ...base, status: "scheduled", scheduled_on: "2026-11-20", starts_at: "2026-11-20T18:00:00Z" },
        "Europe/Berlin",
      ),
    ).toBe(`${formatDay("2026-11-20", { year: true })}, 19:00 CET`);
  });

  it("shows what a waiting event waits on", () => {
    expect(eventWhen({ ...base, status: "waiting", waiting_on: " the siege " }, "UTC")).toBe("Waiting on: the siege");
    expect(eventWhen({ ...base, status: "waiting" }, "UTC")).toBe("Waiting on: not said");
  });

  it("says when there is no date", () => {
    expect(eventWhen(base, "UTC")).toBe("No date yet");
  });
});

describe("eventProblem", () => {
  it("mirrors the backend rules", () => {
    expect(eventProblem("scheduled", null, "")).toMatch(/date/);
    expect(eventProblem("scheduled", "2026-11-20", "")).toBe("");
    expect(eventProblem("waiting", null, "  ")).toMatch(/waiting on/);
    expect(eventProblem("waiting", null, "the king")).toBe("");
    expect(eventProblem("idea", null, "")).toBe("");
  });
});
