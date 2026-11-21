/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("edit=1") }));

import type { Relation } from "@/lib/lore/api";
import { DetailHeader } from "./DetailParts";
import LinkedRoleList from "./LinkedRoleList";
import RelationsEditor from "./RelationsEditor";
import { useEditMode } from "./useEditMode";

afterEach(cleanup);

const noop = async () => {};

function header(edit: { editing: boolean; onEdit?: () => void; onDone?: () => void }, deletedAt: string | null = null) {
  return render(
    <DetailHeader
      kind="character"
      title="Aldric"
      deletedAt={deletedAt}
      onDelete={noop}
      onRestore={noop}
      edit={{ onEdit: () => {}, onDone: () => {}, ...edit }}
    />,
  );
}

describe("DetailHeader edit controls", () => {
  it("offers Edit, not Delete, while reading", () => {
    const onEdit = vi.fn();
    header({ editing: false, onEdit });
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("offers Done and Delete while editing", () => {
    const onDone = vi.fn();
    header({ editing: true, onDone });
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("offers neither on a deleted record, only Restore", () => {
    header({ editing: false }, "2026-11-01T00:00:00Z");
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.getByRole("button", { name: "Restore" })).toBeTruthy();
  });

  it("keeps Delete always on show without edit controls", () => {
    render(<DetailHeader kind="location" title="Keep" onDelete={noop} onRestore={noop} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});

describe("read-only lists", () => {
  it("LinkedRoleList shows roles as text with nothing to change", () => {
    render(
      <LinkedRoleList
        kind="organisation"
        items={[{ kind: "organisation", id: 1, label: "Iron Guild", role: "Treasurer" }]}
        disabled
        empty="None."
        onSave={noop}
      />,
    );
    expect(screen.getByText("Iron Guild")).toBeTruthy();
    expect(screen.getByText("Treasurer")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("RelationsEditor shows relations as badges and notes with nothing to change", () => {
    const outgoing: Relation[] = [
      { id: 4, type: "rival", note: "Old feud", other: { kind: "character", id: 2, label: "Brann" } },
    ];
    render(
      <RelationsEditor
        sourceKind="character"
        sourceId={1}
        relations={{ outgoing, incoming: [] }}
        disabled
        onChanged={noop}
      />,
    );
    expect(screen.getByText("Brann")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();
    expect(screen.getByText("Old feud")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("RelationsEditor keeps its controls when editing", () => {
    const outgoing: Relation[] = [
      { id: 4, type: "rival", note: "Old feud", other: { kind: "character", id: 2, label: "Brann" } },
    ];
    render(
      <RelationsEditor sourceKind="character" sourceId={1} relations={{ outgoing, incoming: [] }} onChanged={noop} />,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
    expect(screen.getByLabelText("Relation with Brann")).toBeTruthy();
  });
});

describe("useEditMode finish", () => {
  it("locks while Done saves and goes back to reading only once saved", async () => {
    const { result } = renderHook(() => useEditMode());
    expect(result.current.editing).toBe(true);
    let resolve!: (saved: boolean) => void;
    let finished!: Promise<void>;
    act(() => {
      finished = result.current.finish(() => new Promise<boolean>((r) => (resolve = r)));
    });
    expect(result.current.finishing).toBe(true);
    expect(result.current.editing).toBe(true);
    await act(async () => {
      resolve(true);
      await finished;
    });
    expect(result.current.finishing).toBe(false);
    expect(result.current.editing).toBe(false);
  });

  it("stays editing when the save fails", async () => {
    const { result } = renderHook(() => useEditMode());
    await act(() => result.current.finish(async () => false));
    expect(result.current.finishing).toBe(false);
    expect(result.current.editing).toBe(true);
  });
});
