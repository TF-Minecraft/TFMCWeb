import { describe, expect, it } from "vitest";

import { CHRONICLE_COALITION_TARGET_ALPHA, buildCoalitionColorLut, coalitionTooltipLines } from "./chronicleCoalition";
import { MAX_PAINTABLE_PROVINCE_ID } from "./chroniclePaint";

const packed = (r: number, g: number, b: number, a: number) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;

const coalitions = [
  { id: "c1", fill_rgba: [100, 150, 110, 215], hatch_rgba: [44, 94, 58, 235] },
  { id: "c2", fill_rgba: [200, 160, 90, 215], hatch_rgba: [176, 132, 37, 235] },
];

describe("buildCoalitionColorLut", () => {
  it("fills members and paints targets lighter in their first claimant's hatch", () => {
    const lut = buildCoalitionColorLut({
      coalitions,
      provinces: [
        { id: 1, coalition: "c1" },
        { id: 2, targeted_by: ["c2", "c1"] },
      ],
    });
    expect(lut[1]).toBe(packed(100, 150, 110, 215));
    expect(lut[2]).toBe(packed(176, 132, 37, CHRONICLE_COALITION_TARGET_ALPHA));
    expect(lut[0]).toBe(0);
  });

  it("keeps a member's fill when another coalition targets it", () => {
    const lut = buildCoalitionColorLut({ coalitions, provinces: [{ id: 3, coalition: "c1", targeted_by: ["c2"] }] });
    expect(lut[3]).toBe(packed(100, 150, 110, 215));
  });

  it("skips hostile rows instead of throwing", () => {
    const lut = buildCoalitionColorLut({
      coalitions: [...coalitions, { id: "bad", fill_rgba: [1, 2, 300, 4] }, null, { fill_rgba: [1, 2, 3, 4] }],
      provinces: [
        null,
        { id: -1, coalition: "c1" },
        { id: 1.5, coalition: "c1" },
        { id: MAX_PAINTABLE_PROVINCE_ID + 1, coalition: "c1" },
        { id: 4, coalition: "bad" },
        { id: 5, coalition: "nobody", targeted_by: ["nobody"] },
        { id: "6", coalition: "c2" },
      ],
    });
    expect(lut.length).toBe(7);
    expect(lut[4]).toBe(0);
    expect(lut[5]).toBe(0);
    expect(lut[6]).toBe(packed(200, 160, 90, 215));
  });

  it("is empty for payloads of the wrong shape", () => {
    for (const payload of [null, [], "x", {}, { coalitions: [] }, { coalitions, provinces: {} }]) {
      expect(buildCoalitionColorLut(payload).length).toBe(0);
    }
  });
});

describe("coalitionTooltipLines", () => {
  it("describes a member province", () => {
    expect(
      coalitionTooltipLines({
        coalition: "Free Alliance",
        coalition_member: "FIG",
        coalition_leader: "Thalendor",
        coalition_target: "The Holy Order",
        coalition_offensive: false,
        coalition_targeted_by: [],
      }),
    ).toEqual(["Coalition: Free Alliance (defensive)", "Member: FIG", "Leader: Thalendor", "Against: The Holy Order"]);
  });

  it("names every coalition opposing a target province", () => {
    expect(
      coalitionTooltipLines({ coalition: null, coalition_targeted_by: ["Free Alliance", "Eastern Pact"] }),
    ).toEqual(["Opposed by: Free Alliance, Eastern Pact"]);
  });

  it("says offensive coalitions are offensive", () => {
    expect(coalitionTooltipLines({ coalition: "Free Alliance", coalition_offensive: true })[0]).toBe(
      "Coalition: Free Alliance (offensive)",
    );
  });

  it("says None for a live province outside every coalition", () => {
    expect(coalitionTooltipLines({ coalition: null, coalition_targeted_by: [] })).toEqual(["Coalition: None"]);
  });

  it("says nothing for data without coalition fields, such as a stored day", () => {
    expect(coalitionTooltipLines({})).toEqual([]);
  });
});
