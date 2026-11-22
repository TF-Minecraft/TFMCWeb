/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import LoreFrame from "./LoreFrame";

const { pathname, replace } = vi.hoisted(() => ({ pathname: { value: "/lore" }, replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/lore/api", () => ({
  getLoreAccess: async () => ({ enabled: true, signed_in: true, access: true, level: "calendar" }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

it("redirects Helpers from the overview without rendering it", async () => {
  pathname.value = "/lore";
  render(<LoreFrame>Overview content</LoreFrame>);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/lore/calendar"));
  expect(screen.queryByText("Overview content")).toBeNull();
});

it("shows only the Calendar tab and blocks a direct visit to an event", async () => {
  pathname.value = "/lore/events/1";
  render(<LoreFrame>Event content</LoreFrame>);
  await screen.findByText(/This part of the lore panel is for Lore Helpers/);
  expect(screen.queryByText("Event content")).toBeNull();
  expect(screen.getByRole("navigation", { name: "Lore panel" }).querySelectorAll("a")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Calendar" }).getAttribute("href")).toBe("/lore/calendar");
});

it("renders the calendar for Helpers", async () => {
  pathname.value = "/lore/calendar";
  render(<LoreFrame>Calendar content</LoreFrame>);
  await screen.findByText("Calendar content");
  expect(replace).not.toHaveBeenCalled();
});
