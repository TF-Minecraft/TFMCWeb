/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ searchLore: vi.fn(), adoptPlayerCharacter: vi.fn() }));
vi.mock("@/lib/lore/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/lore/api")>()),
  searchLore: api.searchLore,
  adoptPlayerCharacter: api.adoptPlayerCharacter,
}));

import type { SearchResult } from "@/lib/lore/api";
import EntityPicker from "./EntityPicker";

const made: SearchResult = { kind: "character", id: 9, label: "Bea", sublabel: "", status: null };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function typeAndCreate(label: string) {
  const box = screen.getByRole("combobox");
  fireEvent.change(box, { target: { value: label } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
  fireEvent.mouseDown(await screen.findByText(`Create character “${label}”`));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  api.searchLore.mockReset().mockResolvedValue([]);
  api.adoptPlayerCharacter.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EntityPicker", () => {
  it("reports busy through create and pick, so the caller can hold its list", async () => {
    const creating = deferred<SearchResult>();
    const busy = vi.fn();
    const onPick = vi.fn();
    render(
      <EntityPicker kinds={["character"]} onPick={onPick} onCreate={() => creating.promise} onBusyChange={busy} />,
    );

    await typeAndCreate("Bea");
    expect(busy).toHaveBeenLastCalledWith(true);
    expect(onPick).not.toHaveBeenCalled();

    await act(async () => {
      creating.resolve(made);
      await creating.promise;
    });
    expect(onPick).toHaveBeenCalledWith(made);
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it("keeps the query and the created record when onPick returns false", async () => {
    const onCreate = vi.fn().mockResolvedValue(made);
    const onPick = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(undefined);
    render(<EntityPicker kinds={["character"]} onPick={onPick} onCreate={onCreate} />);

    await typeAndCreate("Bea");
    await act(async () => {});
    expect(screen.getByRole("combobox")).toHaveProperty("value", "Bea");

    fireEvent.mouseDown(await screen.findByText("Create character “Bea”"));
    await act(async () => {});
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("combobox")).toHaveProperty("value", "");
  });

  it("adopts a player's character before picking it, and asks for players only with characters", async () => {
    const player = { uuid: "u-1", character_id: "c-1" };
    api.searchLore.mockResolvedValue([
      { kind: "character", id: 0, label: "Aldric", sublabel: "Steve", status: "active", player },
    ]);
    const adopted = { kind: "character", id: 12, label: "Aldric", sublabel: "Steve", status: "active" };
    api.adoptPlayerCharacter.mockResolvedValue({ ...adopted, created: true });
    const onPick = vi.fn();
    render(<EntityPicker kinds={["character", "organisation"]} onPick={onPick} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Ald" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(api.searchLore).toHaveBeenLastCalledWith("Ald", ["character", "organisation"], 12, true);
    expect(screen.getByText("Player")).toBeTruthy();
    fireEvent.mouseDown(screen.getByText("Aldric"));
    await act(async () => {});
    expect(api.adoptPlayerCharacter).toHaveBeenCalledWith(player);
    expect(onPick).toHaveBeenCalledWith({ ...adopted, created: true });

    cleanup();
    render(<EntityPicker kinds={["organisation"]} onPick={onPick} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Ald" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(api.searchLore).toHaveBeenLastCalledWith("Ald", ["organisation"], 12, false);
  });
});
