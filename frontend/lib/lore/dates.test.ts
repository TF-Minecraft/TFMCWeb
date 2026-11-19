import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  daysBetween,
  formatStartTimes,
  formatTimeIn,
  isIsoDay,
  isoToZoned,
  monthGrid,
  todayIn,
  weekdayOf,
  zonedToIso,
} from "./dates";

describe("days", () => {
  it("does day arithmetic across month and DST edges", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(daysBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2028-02-29")).toBe(true);
  });

  it("numbers weekdays from Monday like Python", () => {
    expect(weekdayOf("2026-11-16")).toBe(0);
    expect(weekdayOf("2026-11-22")).toBe(6);
  });

  it("builds whole Monday-first weeks for a month", () => {
    const weeks = monthGrid("2026-11-01");
    expect(weeks[0][0]).toBe("2026-10-26");
    expect(weeks.at(-1)!.at(-1)).toBe("2026-12-06");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("knows today in a zone", () => {
    const instant = new Date("2026-11-19T23:30:00Z");
    expect(todayIn("Europe/Berlin", instant)).toBe("2026-11-20");
    expect(todayIn("America/New_York", instant)).toBe("2026-11-19");
  });
});

describe("time zones", () => {
  it("converts wall time to an instant and back", () => {
    expect(zonedToIso("2026-11-20", "19:00", "Europe/Berlin")).toBe("2026-11-20T18:00:00Z");
    expect(zonedToIso("2026-07-01", "19:00", "Europe/Berlin")).toBe("2026-07-01T17:00:00Z");
    expect(zonedToIso("2026-11-20", "19:00", "America/New_York")).toBe("2026-11-21T00:00:00Z");
    expect(isoToZoned("2026-11-21T00:00:00Z", "America/New_York")).toEqual({ day: "2026-11-20", time: "19:00" });
  });

  it("labels CET/CEST and EST/EDT", () => {
    expect(formatTimeIn("2026-11-20T18:00:00Z", "Europe/Berlin")).toBe("19:00 CET");
    expect(formatTimeIn("2026-07-01T17:00:00Z", "Europe/Berlin")).toBe("19:00 CEST");
    expect(formatTimeIn("2026-07-01T17:00:00Z", "America/New_York")).toBe("13:00 EDT");
  });

  it("lists local time then CET and EST, flagging another day", () => {
    expect(formatStartTimes("2026-11-20T23:30:00Z", "Europe/London")).toEqual([
      "23:30 GMT",
      "00:30 CET (Sat 21 Nov)",
      "18:30 EST",
    ]);
    expect(formatStartTimes("2026-11-20T18:00:00Z", "Europe/Berlin")).toEqual(["19:00 CET", "13:00 EST"]);
  });
});
