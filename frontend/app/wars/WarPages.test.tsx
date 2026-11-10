/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import BattleReportView from "@/app/components/wars/BattleReportView";
import WarPageView from "@/app/components/wars/WarPageView";
import WarsIndexView from "@/app/components/wars/WarsIndexView";
import {
  sampleActiveWar,
  sampleBackfilledWar,
  sampleBattleReport,
  sampleEndedWar,
  sampleWarList,
} from "@/lib/wars/sample";
import type { WarPageModel } from "@/lib/wars/types";

vi.mock("@/app/components/map/MapAuthImage", () => ({
  default: ({ path, alt }: { path: string; alt: string }) => <img src={path} alt={alt} />,
}));

afterEach(cleanup);

const now = new Date("2026-11-10T10:00:00Z");

describe("/wars", () => {
  it("splits wars in progress from concluded ones and links each card", () => {
    render(<WarsIndexView wars={sampleWarList.wars} mapId="main" now={now} />);
    const active = screen.getByRole("region", { name: "Wars in progress" });
    const ended = screen.getByRole("region", { name: "Concluded wars" });
    expect(within(active).getByText("War of the Aureate Succession")).toBeTruthy();
    expect(within(active).getByText("Battle 12/11 21:00 CET")).toBeTruthy();
    expect(within(active).getByText("2–1")).toBeTruthy();
    expect(within(active).getByText("3/9")).toBeTruthy();
    expect(within(active).getByRole("link").getAttribute("href")).toBe("/wars/w3-1793642400");
    expect(within(ended).getByText("Attacker victory")).toBeTruthy();
    expect(within(ended).getByText("War of the Salt Marshes")).toBeTruthy();
    expect(within(ended).getAllByRole("link")).toHaveLength(2);
    // Banners come from the map's generated nation banners.
    expect(screen.getByAltText("The Aureate Coterie banner").getAttribute("src")).toBe(
      "/main/banners/nation/201_162_39.png",
    );
  });

  it("keeps ?map= on links for another map", () => {
    render(<WarsIndexView wars={sampleWarList.wars.slice(0, 1)} mapId="dev" now={now} />);
    expect(screen.getAllByRole("link")[0]!.getAttribute("href")).toBe("/wars/w3-1793642400?map=dev");
  });

  it("says so when there are no wars", () => {
    render(<WarsIndexView wars={[]} mapId="main" now={now} />);
    expect(screen.getByText("No war is being fought right now.")).toBeTruthy();
    expect(screen.getByText("No war has ended yet.")).toBeTruthy();
  });
});

describe("/wars/[warKey]", () => {
  it("renders the war report from the sample model", () => {
    render(<WarPageView model={sampleActiveWar} />);
    expect(screen.getByRole("heading", { level: 1, name: "War of the Aureate Succession" })).toBeTruthy();
    expect(screen.getByText(/Goal: Annex de jure lands/)).toBeTruthy();
    for (const title of [
      "Momentum",
      "The road to Malestroit Keep",
      "4 engagements",
      "The cost",
      "Who fought",
      "Who carried the day",
      "How the war unfolded",
    ]) {
      expect(screen.getByRole("region", { name: title })).toBeTruthy();
    }
    const ledger = screen.getByRole("region", { name: "4 engagements" });
    expect(within(ledger).getByText("Battle 1 · Ashford · Field · 05/11/2026")).toBeTruthy();
    expect(within(ledger).getByText("Autoresolved")).toBeTruthy();
    expect(within(ledger).getAllByRole("link", { name: "Battle report" })).toHaveLength(3);
    const participants = screen.getByRole("region", { name: "Who fought" });
    expect(within(participants).getByText("Mercenaries of")).toBeTruthy();
    expect(within(participants).getAllByText("At declaration").length).toBeGreaterThan(0);
    expect(within(participants).getByText("03/11/2026")).toBeTruthy();
    const chronicle = screen.getByRole("region", { name: "How the war unfolded" });
    expect(within(chronicle).getByText("The Aureate Coterie declared war on House Malestroit.")).toBeTruthy();
    expect(
      screen.getByText("The Aureate Coterie has taken 3 of the 9 provinces on the road to Malestroit Keep."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "View on map" }).getAttribute("href")).toBe("/map/main");
  });

  it("hides the heroes when fighter stats are private", () => {
    const hidden: WarPageModel = { ...sampleActiveWar, fighter_stats_public: false, top_fighters: undefined };
    render(<WarPageView model={hidden} />);
    expect(screen.queryByRole("region", { name: "Who carried the day" })).toBeNull();
    expect(screen.getByText(/Individual fighters are not shown on this server/)).toBeTruthy();
  });

  it("shows an ended war's result", () => {
    render(<WarPageView model={sampleEndedWar} />);
    expect(screen.getByText("Ended on 13/10/2025 in victory for Brume.")).toBeTruthy();
    expect(screen.getByText("Truce until 13/11/2025.")).toBeTruthy();
  });

  it("renders a war known only from battle records without a front", () => {
    render(<WarPageView model={sampleBackfilledWar} />);
    expect(screen.getByRole("heading", { level: 1, name: "War of the Salt Marshes" })).toBeTruthy();
    expect(screen.getByText(/only its battle reports survive/)).toBeTruthy();
    expect(screen.queryByText(/The road to/)).toBeNull();
    expect(screen.getByRole("region", { name: "2 engagements" })).toBeTruthy();
    expect(screen.getAllByText("Brume").length).toBeGreaterThan(0);
  });

  it("shows a war in buildup with no battles", () => {
    const buildup: WarPageModel = {
      ...sampleActiveWar,
      state: {
        ...sampleActiveWar.state!,
        buildup: true,
        scheduled_at: null,
        battle_day: null,
        day_vote_closes_at: "2099-01-01T10:00:00Z",
      },
      battles: [],
      participants: [],
      top_fighters: [],
      timeline: sampleActiveWar.timeline.slice(0, 1),
      score: {
        battles_won: { attacker: 0, defender: 0 },
        occupation: { attacker: 0, defender: 0, route_length: 9 },
        deaths: { attacker: 0, defender: 0 },
        regiments_lost: { attacker: 0, defender: 0 },
      },
    };
    render(<WarPageView model={buildup} />);
    expect(screen.getByText(/Buildup: the vote on the first battle day closes 01\/01\/2099/)).toBeTruthy();
    expect(screen.getByText(/No battle has been fought yet/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "The cost" })).toBeNull();
    expect(screen.getAllByText("50%")).toHaveLength(2);
  });
});

describe("/wars/[warKey]/battles/[recordId]", () => {
  it("renders the battle report and sorts its fighters", () => {
    render(<BattleReportView report={sampleBattleReport} />);
    expect(screen.getByRole("heading", { level: 1, name: "Siege of Greywater" })).toBeTruthy();
    expect(screen.getByText("Victory for House Malestroit")).toBeTruthy();
    expect(screen.getByText(/Lasted 1 h 11 min/)).toBeTruthy();
    expect(screen.getByText(/9 of 30 lives left/)).toBeTruthy();
    const table = screen.getByRole("region", { name: `${sampleBattleReport.fighters!.length} fighters` });
    const rows = () => within(table).getAllByRole("row").slice(1);
    expect(rows()).toHaveLength(sampleBattleReport.fighters!.length);
    fireEvent.click(within(table).getByRole("button", { name: /^Fighter/ }));
    const names = rows().map(
      (row) => within(row).getAllByRole("rowheader")[0]!.querySelector("span span")!.textContent,
    );
    expect(names).toEqual([...names].sort((a, b) => a!.localeCompare(b!)));
    fireEvent.click(within(table).getByRole("button", { name: "Defenders" }));
    expect(rows()).toHaveLength(sampleBattleReport.fighters!.filter((f) => f.side === "defender").length);
  });

  it("keeps the per-faction totals when fighter stats are private", () => {
    render(<BattleReportView report={{ ...sampleBattleReport, fighter_stats_public: false, fighters: undefined }} />);
    expect(screen.getByRole("region", { name: "Who fought" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Kills/ })).toBeNull();
    expect(screen.getByText(/Individual fighters are not shown/)).toBeTruthy();
  });
});
