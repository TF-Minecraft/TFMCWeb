import { describe, expect, it } from "vitest";

import {
  bannerPath,
  battleHref,
  battleTitle,
  formatDateTime,
  formatDay,
  formatDuration,
  formatKd,
  formatShortDay,
  formatTime,
  frontSentence,
  goalLabel,
  legibleRgb,
  provinceLabel,
  resolutionLabel,
  resultLabel,
  roleLabel,
  sideColor,
  sideColors,
  sideLeader,
  sideName,
  statusChip,
  statusLine,
  summaryStatusChip,
  warHref,
  warsHref,
} from "./format";
import { sampleActiveWar, sampleBackfilledWar, sampleEndedWar, sampleWarList } from "./sample";

describe("dates", () => {
  it("writes days as dd/mm/yyyy and times in server time", () => {
    expect(formatDay("2026-11-19")).toBe("19/11/2026");
    expect(formatDay("2026-11-19T23:30:00Z")).toBe("20/11/2026");
    expect(formatShortDay("2026-11-19")).toBe("19/11");
    expect(formatTime("2026-11-19T20:00:00Z")).toBe("21:00 CET");
    expect(formatTime("2026-07-01T19:00:00Z")).toBe("21:00 CEST");
    expect(formatDateTime("2026-11-05T20:00:00Z")).toBe("05/11/2026 21:00 CET");
    expect(formatDay(null)).toBe("");
    expect(formatDateTime("not a date")).toBe("");
  });

  it("writes durations and K/D plainly", () => {
    expect(formatDuration(42 * 60)).toBe("42 min");
    expect(formatDuration(71 * 60)).toBe("1 h 11 min");
    expect(formatDuration(120 * 60)).toBe("2 h");
    expect(formatDuration(null)).toBe("");
    expect(formatKd(9, 2)).toBe("4.50");
    expect(formatKd(3, 0)).toBe("3.00");
  });
});

describe("labels", () => {
  it("names goals, resolutions, roles and provinces", () => {
    expect(goalLabel("de_jure_annex")).toBe("Annex de jure lands");
    expect(goalLabel("new_goal")).toBe("New goal");
    expect(resolutionLabel("autoresolve")).toBe("Autoresolved");
    expect(resolutionLabel("naval_default")).toBe("Naval default");
    expect(resolutionLabel("staff")).toBe("Staff decision");
    expect(roleLabel("mercenary")).toBe("Mercenaries");
    expect(roleLabel("backer")).toBe("Backer");
    expect(provinceLabel(null, 80)).toBe("Province 80");
    expect(provinceLabel("Ashford", 77)).toBe("Ashford");
  });

  it("titles a battle card", () => {
    const [first, , , raid] = sampleActiveWar.battles;
    expect(battleTitle(first!)).toBe("Battle 1 · Ashford · Field · 05/11/2026");
    expect(battleTitle(raid!)).toBe("Raid · Fenwick · 09/11/2026");
    expect(battleTitle(sampleBackfilledWar.battles[0]!)).toBe("Battle 1 · Unknown ground · Field · 14/08/2025");
  });

  it("reads results", () => {
    expect(resultLabel({ reason: "attacker_victory", winner: "attacker", truce_until: null })).toBe("Attacker victory");
    expect(resultLabel({ reason: "white_peace", winner: null, truce_until: null })).toBe("White peace");
    expect(resultLabel(null)).toBe("Ended");
  });
});

describe("status", () => {
  const now = new Date("2026-11-10T10:00:00Z");

  it("shows the next battle, the buildup vote or the result on a war card", () => {
    const [active, ended, backfill] = sampleWarList.wars;
    expect(summaryStatusChip(active!, now)).toBe("Battle 12/11 21:00 CET");
    expect(summaryStatusChip(ended!, now)).toBe("Attacker victory");
    expect(summaryStatusChip(backfill!, now)).toBe("Ended");
    const buildup = {
      buildup: true,
      day_vote_closes_at: "2026-11-13T09:50:00Z",
      battle_day: null,
      scheduled_at: null,
    };
    expect(statusChip({ status: "active", result: null, phase: buildup }, now)).toBe("Buildup: day vote closes 13/11");
    expect(statusChip({ status: "active", result: null, phase: { ...buildup, battle_day: "2026-11-19" } }, now)).toBe(
      "Battle day 19/11",
    );
    // Availability wars (v1.4) name their next locked battle day, with its time once decided.
    const grid = { ...buildup, buildup: false, day_vote_closes_at: null };
    expect(
      statusChip(
        { status: "active", result: null, phase: { ...grid, battle_days: [{ date: "2026-11-20", hour: null }] } },
        now,
      ),
    ).toBe("Battle day 20/11");
    expect(
      statusChip(
        { status: "active", result: null, phase: { ...grid, battle_days: [{ date: "2026-11-20", hour: 24 }] } },
        now,
      ),
    ).toBe("Battle day 20/11 00:00 CET");
    // A battle time long past is stale, not "next".
    expect(
      statusChip(
        { status: "active", result: null, phase: { ...buildup, buildup: false, scheduled_at: "2026-11-01T20:00:00Z" } },
        now,
      ),
    ).toBe("In progress");
  });

  it("writes the war page's status line", () => {
    expect(statusLine(sampleActiveWar, now)).toBe("Next battle 12/11/2026 21:00 CET.");
    expect(statusLine(sampleEndedWar, now)).toBe("Ended on 13/10/2025 in victory for Brume.");
    expect(statusLine(sampleBackfilledWar, now)).toBe("Ended on 17/08/2025.");
    expect(
      statusLine(
        {
          status: "ended",
          result: { reason: "white_peace", winner: null, truce_until: null },
          ended_at: null,
          state: null,
        },
        now,
      ),
    ).toBe("Ended in a white peace.");
    const state = { ...sampleActiveWar.state!, scheduled_at: null, battle_days: [{ date: "2026-11-20", hour: 22 }] };
    expect(statusLine({ ...sampleActiveWar, state }, now)).toBe("Next battle day 20/11/2026, starting 22:00 CET.");
  });
});

describe("sides", () => {
  it("finds leaders and their colours, with theme fallbacks", () => {
    const attacker = sideLeader(sampleActiveWar.state, "attacker");
    expect(attacker?.name).toBe("The Aureate Coterie");
    expect(sideColor(attacker, "attacker")).toBe("#c9a227");
    // House Malestroit's deep red is lifted until it reads on the dark page.
    const defender = sideLeader(sampleActiveWar.state, "defender");
    expect(sideColor(defender, "defender")).not.toBe("#8a2030");
    expect(legibleRgb([201, 162, 39])).toEqual([201, 162, 39]);
    expect(legibleRgb([138, 32, 48], 4.5)).not.toEqual(legibleRgb([138, 32, 48]));
    expect(sideColor(null, "defender")).toBe("#5a93dc");
    expect(sideName(null, "attacker")).toBe("the attackers");
    expect(sideName(null, "defender", true)).toBe("The defenders");
    const same = { id: "x", founded_at: null, name: "X", name_raw: "X", rgb: "10,20,30" };
    expect(sideColors(same, same)).toEqual({ attacker: "#c9772e", defender: "#5a93dc" });
    expect(sideColors(attacker, sideLeader(sampleActiveWar.state, "defender")).attacker).toBe("#c9a227");
  });

  it("builds banner paths and links", () => {
    expect(bannerPath("main", sideLeader(sampleActiveWar.state, "defender"))).toBe(
      "/main/banners/nation/138_32_48.png",
    );
    expect(bannerPath("main", { id: null, founded_at: null, name: "X", name_raw: "X", rgb: null })).toBeNull();
    expect(warsHref("main")).toBe("/wars");
    expect(warsHref("dev")).toBe("/wars?map=dev");
    expect(warHref("main", "w3-1793642400")).toBe("/wars/w3-1793642400");
    expect(battleHref("dev", "w3-1", "r-1")).toBe("/wars/w3-1/battles/r-1?map=dev");
  });
});

describe("frontSentence", () => {
  it("says how far the attacker has got", () => {
    const names = { attacker: "The Aureate Coterie", defender: "House Malestroit" };
    expect(frontSentence(names, 3, 0, 9, "Malestroit Keep")).toBe(
      "The Aureate Coterie has taken 3 of the 9 provinces on the road to Malestroit Keep.",
    );
    expect(frontSentence({ attacker: "the attackers", defender: "the defenders" }, 0, 1, 4, "Fenwick")).toBe(
      "The attackers have not taken a province on the road to Fenwick yet. The defenders hold 1 of the attackers' own provinces.",
    );
  });
});
