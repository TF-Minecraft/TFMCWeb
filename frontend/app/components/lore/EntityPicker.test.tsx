/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ searchLore: vi.fn() }));
vi.mock("@/lib/lore/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/lore/api")>()),
  searchLore: api.searchLore,
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
});
