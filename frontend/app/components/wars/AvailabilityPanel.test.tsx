/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AvailabilityPanel from "@/app/components/wars/AvailabilityPanel";
import WarActions from "@/app/components/wars/WarActions";
import type { WarAction, WarMe } from "@/lib/wars/actions";
import type { AvailabilityDate } from "@/lib/wars/availability";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const names = { attacker: "The Aureate Coterie", defender: "House Malestroit" };
const HOURS = [21, 22, 23, 24, 25];
const now = new Date("2026-11-17T10:00:10Z");

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

function me(overrides: Partial<WarMe> = {}): WarMe {
  return {
    signed_in: true,
    linked: true,
    eligible: true,
    side: "attacker",
    vote: {
      kind: "availability",
      closes_at: "2026-11-18T20:00:00Z",
      hours: HOURS,
      hour_labels: ["21:00 CET", "22:00 CET", "23:00 CET", "00:00 CET", "01:00 CET"],
      dates: [
        date({ date: "2026-11-19", label: "Thu 19/11", state: "battle", hour: 22, editable: false }),
        date({ date: "2026-11-20", label: "Fri 20/11", state: "battle" }),
        date(),
        date({ date: "2026-11-22", label: "Sun 22/11", state: "no_battle", editable: false }),
      ],
      need: { attacker: 3, defender: 2 },
    },
    picks: null,
    marks: {},
    none: false,
    tally: [{ date: "2026-11-20", hour: 22, attacker: 4, defender: 3 }],
    actions: { call_to_arms_answer: null, day_vote: null, hour_vote: null, availability: null },
    availability_actions: [],
    calls_to_arms: [],
    ...overrides,
  };
}

function action(overrides: Partial<WarAction> = {}): WarAction {
  return {
    id: 9,
    kind: "availability",
    status: "pending",
    reason: null,
    source: "web",
    payload: { date: "2026-11-21", hours: [21] },
    created_at: "2026-11-17T10:00:00Z",
    applied_at: null,
    ...overrides,
  };
}

describe("AvailabilityPanel", () => {
  it("shows the grid, the counts, the badges and the rule", () => {
    const onChange = vi.fn();
    render(
      <AvailabilityPanel me={me()} names={names} marks={{}} onChange={onChange} now={now} timeZone="Europe/London" />,
    );
    expect(screen.getByRole("heading", { name: "When can you fight?" })).toBeTruthy();
    expect(screen.getByText("You haven't marked anything")).toBeTruthy();
    expect(screen.getByText("⚔ Next battle: Thu 19 Nov, 22:00 CET (21:00 your time)")).toBeTruthy();
    expect(screen.getByText(/You mark for the attackers \(The Aureate Coterie\)/)).toBeTruthy();
    expect(screen.getByText("Battle day — time locks Fri 21:00")).toBeTruthy();
    expect(screen.getByText("No battle")).toBeTruthy();
    expect(
      screen.getByText(
        "A day becomes a battle when 3 attackers and 2 defenders can come at the same time. It's decided 2 days before; the time is decided 1 day before.",
      ),
    ).toBeTruthy();

    const fri = within(screen.getByRole("group", { name: "Fri 20/11" }));
    const cell = fri.getByRole("button", {
      name: /^Fri 20\/11, 22:00 CET \(21:00 your time\)\. Attackers 4, defenders 3/,
    });
    expect(cell.textContent).toContain("A 4 · D 3");
    expect(cell.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(cell);
    expect(onChange).toHaveBeenLastCalledWith({ "2026-11-20": [22] });
    fireEvent.click(fri.getByRole("button", { name: /Mark every time on this day/ }));
    expect(onChange).toHaveBeenLastCalledWith({ "2026-11-20": HOURS });

    const sun = within(screen.getByRole("group", { name: "Sun 22/11" }));
    expect(sun.getAllByRole("button").every((b) => b.hasAttribute("disabled"))).toBe(true);
    const thu = within(screen.getByRole("group", { name: "Thu 19/11" }));
    expect(thu.getByRole("button", { name: /22:00 CET.*The battle starts at this time/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save my times" }).hasAttribute("disabled")).toBe(true);
  });

  it("says when you are marked and lets you save a change", () => {
    const onSave = vi.fn();
    render(
      <AvailabilityPanel
        me={me({ marks: { "2026-11-21": [21] } })}
        names={names}
        marks={{ "2026-11-21": [21, 22] }}
        dirty
        onSave={onSave}
        now={now}
      />,
    );
    expect(screen.getByText(/✔ Marked — you can change it until each day is decided/)).toBeTruthy();
    expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
    const sat = within(screen.getByRole("group", { name: "Sat 21/11" }));
    expect(sat.getByRole("button", { name: /^Sat 21\/11, 22:00 CET/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Save my times" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("offers none of these days, and shows a refusal with its day", () => {
    const onNone = vi.fn();
    const refused = action({
      status: "rejected",
      reason: "That day is already decided.",
      applied_at: now.toISOString(),
    });
    const { rerender } = render(
      <AvailabilityPanel
        me={me({ availability_actions: [refused] })}
        names={names}
        marks={{}}
        onNone={onNone}
        now={now}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Sat 21/11: That day is already decided.");
    fireEvent.click(screen.getByRole("button", { name: "None of these days work for me" }));
    expect(onNone).toHaveBeenCalled();
    rerender(<AvailabilityPanel me={me({ none: true })} names={names} marks={{}} now={now} />);
    expect(screen.getByText(/You said none of these days work for you/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "None of these days work for me" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("keeps the sign-in and link messages for everyone else", () => {
    const vote = { kind: "availability" as const, closes_at: "2026-11-18T20:00:00Z" };
    render(
      <AvailabilityPanel
        me={me({ signed_in: false, linked: false, eligible: false, side: null, vote, marks: null, tally: null })}
        names={names}
        marks={{}}
        signInHref="https://api.example/auth/discord/start"
      />,
    );
    expect(screen.getByRole("link", { name: "Sign in to vote" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    render(<AvailabilityPanel me={me({ eligible: false, side: null, vote })} names={names} marks={{}} />);
    expect(screen.getByText("Only members of the warring factions vote.")).toBeTruthy();
  });
});

describe("WarActions with the availability grid", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example");
  });

  it("sends each changed day, then polls until the server answers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const sent: unknown[] = [];
    const replies: WarMe[] = [
      me(),
      me({
        availability_actions: [
          action({ id: 1, payload: { date: "2026-11-20", hours: HOURS } }),
          action({ id: 2, payload: { date: "2026-11-21", hours: [23] } }),
        ],
      }),
      me({
        marks: { "2026-11-20": HOURS, "2026-11-21": [23] },
        availability_actions: [
          action({
            id: 1,
            status: "applied",
            applied_at: new Date().toISOString(),
            payload: { date: "2026-11-20", hours: HOURS },
          }),
          action({
            id: 2,
            status: "applied",
            applied_at: new Date().toISOString(),
            payload: { date: "2026-11-21", hours: [23] },
          }),
        ],
      }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          expect(url).toBe("https://api.example/main/wars/w3-1793642400/availability");
          sent.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ action: action() }), { status: 200 });
        }
        return new Response(JSON.stringify(replies.shift() ?? replies[replies.length - 1]), { status: 200 });
      }),
    );
    try {
      render(<WarActions mapId="main" warKey="w3-1793642400" names={names} />);
      const fri = within(await screen.findByRole("group", { name: "Fri 20/11" }));
      fireEvent.click(fri.getByRole("button", { name: /Mark every time on this day/ }));
      const sat = within(screen.getByRole("group", { name: "Sat 21/11" }));
      fireEvent.click(sat.getByRole("button", { name: /^Sat 21\/11, 23:00 CET/ }));
      expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Save my times" }));
      expect((await screen.findByRole("status")).textContent).toBe("Waiting for the server…");
      expect(sent).toEqual([
        { date: "2026-11-20", hours: HOURS },
        { date: "2026-11-21", hours: [23] },
      ]);
      expect(screen.queryByText("You have unsaved changes.")).toBeNull();
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
      expect(screen.getByText(/✔ Marked/)).toBeTruthy();
      expect(document.getElementById("vote")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends none of these days on its own", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          bodies.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ detail: "Too many changes in a short time." }), { status: 429 });
        }
        return new Response(JSON.stringify(me()), { status: 200 });
      }),
    );
    render(<WarActions mapId="main" warKey="w3-1793642400" names={names} />);
    fireEvent.click(await screen.findByRole("button", { name: "None of these days work for me" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Too many changes in a short time.");
    expect(bodies).toEqual([{ none: true }]);
  });
});
