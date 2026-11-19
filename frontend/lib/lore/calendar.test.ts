import { describe, expect, it } from "vitest";

import {
  eventsByDay,
  gridRange,
  shortStartTime,
  timeZoneChoices,
  weekLabel,
  weekOf,
  weekOverride,
  weekStartOf,
} from "./calendar";

describe("weeks", () => {
  it("finds the Monday-first week of a day", () => {
    expect(weekStartOf("2026-11-19")).toBe("2026-11-16");
    expect(weekStartOf("2026-11-16")).toBe("2026-11-16");
    expect(weekStartOf("2026-11-22")).toBe("2026-11-16");
    expect(weekOf("2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(weekLabel("2026-11-16")).toBe("16 Nov – 22 Nov");
  });

  it("covers the month grid in one range the backend accepts", () => {
    const { from, to, weeks } = gridRange("2026-11-01");
    expect(from).toBe("2026-10-26");
    expect(to).toBe("2026-12-06");
    expect(weeks).toHaveLength(6);
    // A month starting on Monday needs no leading days.
    expect(gridRange("2027-02-01").from).toBe("2027-02-01");
    expect(gridRange("2027-02-01").to).toBe("2027-02-28");
  });

  it("builds a whole-week override and drops the note when clearing", () => {
    const set = weekOverride("2026-11-19", "partial", " evenings ");
    expect(set).toHaveLength(7);
    expect(set[0]).toEqual({ day: "2026-11-16", status: "partial", note: "evenings" });
    expect(set[6].day).toBe("2026-11-22");
    expect(weekOverride("2026-11-19", null, "x").every((d) => d.status === null && d.note === "")).toBe(true);
  });
});

describe("eventsByDay", () => {
  it("groups by scheduled day in order and skips unscheduled", () => {
    const grouped = eventsByDay([
      { id: 1, scheduled_on: "2026-11-20" },
      { id: 2, scheduled_on: null },
      { id: 3, scheduled_on: "2026-11-20" },
      { id: 4, scheduled_on: "2026-11-21" },
    ]);
    expect(Object.keys(grouped).sort()).toEqual(["2026-11-20", "2026-11-21"]);
    expect(grouped["2026-11-20"].map((e) => e.id)).toEqual([1, 3]);
  });
});

describe("time zones", () => {
  it("keeps the current zone in the choices, sorted and unique", () => {
    expect(timeZoneChoices("Europe/London", ["UTC", "Europe/Berlin", "Europe/London"])).toEqual([
      "Europe/Berlin",
      "Europe/London",
      "UTC",
    ]);
    expect(timeZoneChoices("Asia/Tokyo", null)).toContain("Asia/Tokyo");
    expect(timeZoneChoices("Asia/Tokyo", [])).toContain("America/New_York");
  });

  it("shows a start time in the viewer's zone with a day hint when it moves", () => {
    // 19:00 CET on 20 Nov is 13:00 in New York the same day, and 03:00 next day in Tokyo.
    expect(shortStartTime("2026-11-20T18:00:00Z", "Europe/Berlin", "2026-11-20")).toBe("19:00");
    expect(shortStartTime("2026-11-20T18:00:00Z", "America/New_York", "2026-11-20")).toBe("13:00");
    expect(shortStartTime("2026-11-20T18:00:00Z", "Asia/Tokyo", "2026-11-20")).toBe("03:00 (Sat 21 Nov)");
    expect(shortStartTime(null, "UTC", "2026-11-20")).toBe("");
  });
});
