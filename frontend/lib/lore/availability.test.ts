import { describe, expect, it } from "vitest";

import type { AvailabilityGrid } from "./api";
import { countDay, effectiveDay, rankForDay } from "./availability";

const weekly = Array.from({ length: 7 }, (_, i) => ({
  status: i === 4 ? ("full" as const) : null,
  note: i === 4 ? "evenings" : "",
}));

describe("effectiveDay", () => {
  it("prefers a day's own entry, then the weekday default", () => {
    expect(effectiveDay(weekly, {}, "2026-11-20")).toEqual({ status: "full", note: "evenings", source: "weekly" });
    expect(effectiveDay(weekly, { "2026-11-20": { status: "none", note: "away" } }, "2026-11-20")).toEqual({
      status: "none",
      note: "away",
      source: "override",
    });
    expect(effectiveDay(weekly, {}, "2026-11-19")).toEqual({ status: null, note: "", source: null });
  });
});

describe("countDay", () => {
  it("counts each status", () => {
    const grid = {
      from: "2026-11-20",
      to: "2026-11-20",
      days: ["2026-11-20"],
      people: [
        { days: { "2026-11-20": { status: "full", note: "", source: "weekly" } } },
        { days: { "2026-11-20": { status: "partial", note: "", source: "override" } } },
        { days: { "2026-11-20": { status: null, note: "", source: null } } },
      ],
    } as unknown as AvailabilityGrid;
    expect(countDay(grid, "2026-11-20")).toEqual({ full: 1, partial: 1, none: 0, unset: 1 });
    expect(countDay(null, "2026-11-20")).toEqual({ full: 0, partial: 0, none: 0, unset: 0 });
  });
});

describe("rankForDay", () => {
  it("puts available people first", () => {
    const ranked = rankForDay([
      { name: "Bea", status: "none" as const },
      { name: "Cal", status: null },
      { name: "Ann", status: "partial" as const },
      { name: "Dee", status: "full" as const },
    ]);
    expect(ranked.map((p) => p.name)).toEqual(["Dee", "Ann", "Cal", "Bea"]);
  });
});
