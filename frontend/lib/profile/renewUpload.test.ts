/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from "vitest";
import { getAccount, startLinkedProfileSession } from "../account/api";
import { SkinsApiError } from "../skins/api";
import { renewUpload, withRenewal } from "./renewUpload";
import { setSession } from "./session";
import { StartRefusedError } from "./start";

vi.mock("../account/api", () => ({ getAccount: vi.fn(), startLinkedProfileSession: vi.fn() }));
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetAllMocks();
});

const UPLOAD = { player_uuid: "p", realm_id: "main" };
const profile = (player_uuid: string) => ({
  session_token: `profile-${player_uuid}`,
  player_uuid,
  expires_at: "2099-01-01T00:00:00Z",
  scope: "profile",
  realm_id: "main",
});
const signedInAs = (player_uuid: string) =>
  vi.mocked(getAccount).mockResolvedValue({ minecraft: { player_uuid } } as Awaited<ReturnType<typeof getAccount>>);

it("renews an ended session and runs the request again", async () => {
  const run = vi.fn(async (token: string) => {
    if (token === "old") throw new SkinsApiError("Invalid or expired session", 401);
    return token;
  });
  await expect(withRenewal("old", async () => "new", run)).resolves.toBe("new");
});

it("doesn't renew for another refusal", async () => {
  const renew = vi.fn();
  const run = () => Promise.reject(new SkinsApiError("Bad file", 400));
  await expect(withRenewal("t", renew, run)).rejects.toThrow("Bad file");
  expect(renew).not.toHaveBeenCalled();
});

it("starts again with the stored Profile session", async () => {
  setSession(profile("p"), true);
  await expect(renewUpload("skin", UPLOAD, async (token) => token)).resolves.toBe("profile-p");
  expect(getAccount).not.toHaveBeenCalled();
});

it("opens Profile again when its session ended too", async () => {
  signedInAs("p");
  vi.mocked(startLinkedProfileSession).mockResolvedValue(profile("p"));
  await expect(renewUpload("skin", UPLOAD, async (token) => token)).resolves.toBe("profile-p");
});

it.each([
  ["signed out", () => void vi.mocked(getAccount).mockResolvedValue(null), UPLOAD],
  ["another player", () => void (setSession(profile("q"), true), signedInAs("q")), UPLOAD],
  ["another realm", () => setSession(profile("p"), true), { ...UPLOAD, realm_id: "dev" }],
  ["a staff code", () => setSession(profile("p"), true), { ...UPLOAD, staff: true }],
])("never starts for %s", async (_case, arrange, upload) => {
  arrange();
  const start = vi.fn();
  await expect(renewUpload("skin", upload, start)).rejects.toThrow("session has ended");
  expect(start).not.toHaveBeenCalled();
});

it("says why when the start is refused", async () => {
  setSession(profile("p"), true);
  const start = () => Promise.reject(new StartRefusedError("rank", null));
  await expect(renewUpload("drink", UPLOAD, start)).rejects.toThrow("Your rank can’t make drinks");
});
