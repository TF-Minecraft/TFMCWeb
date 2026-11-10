/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WarActions, { CallToArmsCard, VotePanel } from "@/app/components/wars/WarActions";
import type { OpenCallToArms, WarAction, WarMe } from "@/lib/wars/actions";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const names = { attacker: "The Aureate Coterie", defender: "House Malestroit" };
const DAYS = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"];
const now = new Date("2026-11-10T10:00:10Z");

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

function action(overrides: Partial<WarAction> = {}): WarAction {
  return {
    id: 7,
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

const call: OpenCallToArms = {
  caller: { id: "aureate", founded_at: null, name: "The Aureate Coterie", name_raw: "The Aureate Coterie", rgb: null },
  target: {
    id: "sprockets",
    founded_at: null,
    name: "The Jolly Sprockets",
    name_raw: "The Jolly Sprockets",
    rgb: null,
  },
  side: "attacker",
  coalition: false,
  action: null,
};

describe("VotePanel", () => {
  it("asks signed-out readers to sign in, with no tallies", () => {
    render(
      <VotePanel
        me={me({
          signed_in: false,
          linked: false,
          eligible: false,
          side: null,
          picks: null,
          tally: null,
          vote: { kind: "day", closes_at: "2026-11-13T09:50:00Z" },
        })}
        names={names}
        picks={[]}
        signInHref="https://api.example/auth/discord/start?return_to=%2Fwars%2Fw3"
      />,
    );
    expect(screen.getByRole("link", { name: "Sign in to vote" }).getAttribute("href")).toContain("return_to");
    expect(screen.getByText(/The vote closes 13\/11/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("tells members of other factions only warring factions vote", () => {
    render(
      <VotePanel
        me={me({ eligible: false, side: null, picks: null, tally: null, vote: { kind: "hour", closes_at: null } })}
        names={names}
        picks={[]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Vote on the battle hour" })).toBeTruthy();
    expect(screen.getByText(/Only members of the warring factions vote\./)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the options, the side tallies, the saved picks and the in-game rule", () => {
    const onToggle = vi.fn();
    render(<VotePanel me={me()} names={names} picks={["2026-11-18"]} onToggle={onToggle} now={now} />);
    const options = screen.getAllByRole("button", { pressed: false });
    expect(options).toHaveLength(4);
    const wed = screen.getByRole("button", { name: /Wed 18\/11/ });
    expect(wed.getAttribute("aria-pressed")).toBe("true");
    expect(wed.textContent).toContain("Leading");
    expect(wed.textContent).toContain("Attackers 2, defenders 1");
    expect(screen.getByText(/You vote with the attackers \(The Aureate Coterie\)/)).toBeTruthy();
    expect(screen.getByText("Your saved picks: Wed 18/11.")).toBeTruthy();
    expect(screen.getByText(/both sides can best make; ties go to the earlier one/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Thu 19\/11/ }));
    expect(onToggle).toHaveBeenCalledWith("2026-11-19");
  });

  it("enables Save once the picks change, and shows the last action's status", () => {
    const { rerender } = render(
      <VotePanel
        me={me({ actions: { call_to_arms_answer: null, day_vote: action(), hour_vote: null } })}
        names={names}
        picks={["2026-11-19"]}
        now={now}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Waiting for the server…");
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
    rerender(
      <VotePanel
        me={me({
          actions: {
            call_to_arms_answer: null,
            day_vote: action({ status: "rejected", reason: "The day vote has closed." }),
            hour_vote: null,
          },
        })}
        names={names}
        picks={["2026-11-17"]}
        now={now}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("The day vote has closed.");
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(false);
  });

  it("shows nothing when no vote is open", () => {
    const { container } = render(<VotePanel me={me({ vote: null })} names={names} picks={[]} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("CallToArmsCard", () => {
  it("offers Accept and Decline to the called leader", () => {
    const onAnswer = vi.fn();
    render(<CallToArmsCard call={call} names={names} onAnswer={onAnswer} />);
    expect(screen.getByRole("heading", { name: "The Jolly Sprockets is called to arms" })).toBeTruthy();
    expect(screen.getByText(/with the attackers, against House Malestroit/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("waits for the server, then shows the refusal and the buttons again", () => {
    const answer = action({ kind: "call_to_arms_answer", payload: { target_faction_id: "sprockets", accept: true } });
    const { rerender } = render(<CallToArmsCard call={{ ...call, action: answer }} names={names} />);
    expect(screen.getByRole("status").textContent).toBe("Waiting for the server…");
    expect(screen.queryByRole("button")).toBeNull();
    const reason = "A battle of this war is being fought. Answer the call once it ends.";
    rerender(<CallToArmsCard call={{ ...call, action: { ...answer, status: "rejected", reason } }} names={names} />);
    expect(screen.getByRole("status").textContent).toBe(reason);
    expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
  });
});

describe("WarActions", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example");
  });

  it("saves the picks, then polls /me until the server answers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const replies: WarMe[] = [
      me(),
      me({
        actions: {
          call_to_arms_answer: null,
          day_vote: action({ payload: { picks: ["2026-11-18", "2026-11-19"] } }),
          hour_vote: null,
        },
      }),
      me({
        picks: ["2026-11-18", "2026-11-19"],
        actions: {
          call_to_arms_answer: null,
          day_vote: action({
            status: "applied",
            applied_at: new Date().toISOString(),
            payload: { picks: ["2026-11-18", "2026-11-19"] },
          }),
          hour_vote: null,
        },
      }),
    ];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        expect(url).toBe("https://api.example/main/wars/w3-1793642400/vote");
        expect(JSON.parse(String(init.body))).toEqual({ kind: "day", picks: ["2026-11-18", "2026-11-19"] });
        expect(init.credentials).toBe("include");
        return new Response(JSON.stringify({ action: action() }), { status: 200 });
      }
      expect(url).toBe("https://api.example/main/wars/w3-1793642400/me");
      return new Response(JSON.stringify(replies.shift() ?? replies[replies.length - 1]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<WarActions mapId="main" warKey="w3-1793642400" names={names} />);
      fireEvent.click(await screen.findByRole("button", { name: /Thu 19\/11/ }));
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect((await screen.findByRole("status")).textContent).toBe("Waiting for the server…");
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
      expect(screen.getByText("Your saved picks: Wed 18/11, Thu 19/11.")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows an API refusal next to the vote", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? new Response(JSON.stringify({ detail: "This vote is closed." }), { status: 409 })
          : new Response(JSON.stringify(me()), { status: 200 }),
      ),
    );
    render(<WarActions mapId="dev" warKey="w3-1793642400" names={names} />);
    fireEvent.click(await screen.findByRole("button", { name: /Fri 20\/11/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("This vote is closed.");
  });

  it("renders nothing when /me cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    const { container } = render(<WarActions mapId="main" warKey="w3-1793642400" names={names} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.innerHTML).toBe("");
  });
});
