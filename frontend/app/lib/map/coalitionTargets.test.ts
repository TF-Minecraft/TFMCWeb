import { describe, expect, it } from "vitest";

import { buildCoalitionTargetNotes } from "./coalitionTargets";

const regions = {
  c1: { name: "Free Alliance", target: "TheHolyOrder", target_name: "The Holy Order", target_provinces: [5, 6] },
  c2: { name: "Eastern Pact", target: "TheHolyOrder", target_name: "The Holy Order", target_provinces: [5, 6] },
  c3: { name: "Crimson Compact", target: "Thalendor", target_name: "Thalendor", target_provinces: [1] },
};

describe("buildCoalitionTargetNotes", () => {
  it("names the target realm and every coalition aimed at it", () => {
    const note = buildCoalitionTargetNotes(regions);
    expect(note(5)).toEqual({ text: "The Holy Order", hint: "Target of Free Alliance, Eastern Pact" });
    expect(note(1)).toEqual({ text: "Thalendor", hint: "Target of Crimson Compact" });
  });

  it("says nothing for land no coalition targets", () => {
    expect(buildCoalitionTargetNotes(regions)(99)).toBeNull();
    expect(buildCoalitionTargetNotes(null)(5)).toBeNull();
  });

  it("leads with the open coalition", () => {
    expect(buildCoalitionTargetNotes(regions, "c2")(5)?.hint).toBe("Target of Eastern Pact, Free Alliance");
  });

  it("falls back to the target id and skips malformed records", () => {
    const note = buildCoalitionTargetNotes({
      a: { name: "A", target: "Rat_Hill", target_provinces: [7, -1, 2.5, "8"] },
      b: { name: "B", target_provinces: [9] },
      c: null,
      d: { name: "D", target_name: "X", target_provinces: "nope" },
    });
    expect(note(7)).toEqual({ text: "Rat_Hill", hint: "Target of A" });
    expect(note(8)).toBeNull();
    expect(note(9)).toBeNull();
  });
});
