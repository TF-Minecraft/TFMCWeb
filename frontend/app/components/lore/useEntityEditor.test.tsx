/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getEntity: vi.fn(), updateEntity: vi.fn() }));
vi.mock("@/lib/lore/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/lore/api")>()),
  getEntity: api.getEntity,
  updateEntity: api.updateEntity,
}));

import { useEntityEditor } from "./useEntityEditor";

type Row = { id: number; version: number; summary: string; name: string; deleted_at: null };
const row = (version: number, summary: string, name = "Ada"): Row => ({
  id: 1,
  version,
  summary,
  name,
  deleted_at: null,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function loaded(first: Row) {
  api.getEntity.mockResolvedValueOnce(first);
  const hook = renderHook(() => useEntityEditor("character", 1));
  await waitFor(() => expect(hook.result.current.detail).not.toBeNull());
  return hook;
}

beforeEach(() => {
  api.getEntity.mockReset();
  api.updateEntity.mockReset();
});
afterEach(cleanup);

describe("useEntityEditor", () => {
  it("keeps an edit back to the old value made while a save is pending", async () => {
    const { result } = await loaded(row(1, ""));
    const pending = deferred<Row>();
    api.updateEntity.mockReturnValueOnce(pending.promise);

    act(() => result.current.set("summary", "A"));
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.save();
    });
    act(() => result.current.set("summary", ""));
    await act(async () => {
      pending.resolve(row(2, "A"));
      await saving;
    });

    expect(result.current.detail?.summary).toBe("A");
    expect(result.current.value("summary")).toBe("");
    expect(result.current.dirty).toBe(true);
  });

  it("drops an edit kept for a pending save when that save fails", async () => {
    const { result } = await loaded(row(1, ""));
    const pending = deferred<Row>();
    api.updateEntity.mockReturnValueOnce(pending.promise.then(() => Promise.reject(new Error("down"))));

    act(() => result.current.set("summary", "A"));
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.save();
    });
    act(() => result.current.set("summary", ""));
    await act(async () => {
      pending.resolve(row(2, "A"));
      await saving;
    });

    expect(result.current.dirty).toBe(false);
    expect(result.current.error).not.toBe("");
  });

  it("saves a draft with the version it started from even if a newer copy lands first", async () => {
    const { result } = await loaded(row(1, ""));
    api.updateEntity.mockResolvedValueOnce(row(3, "mine"));

    // Both before React re-renders: the draft must still remember it began on version 1.
    act(() => {
      result.current.set("summary", "mine");
      result.current.replace(row(2, "theirs") as never);
    });
    expect(result.current.conflict).not.toBeNull();

    await act(async () => {
      await result.current.save();
    });
    expect(api.updateEntity).toHaveBeenCalledWith("character", 1, 1, { summary: "mine" });
  });
});
