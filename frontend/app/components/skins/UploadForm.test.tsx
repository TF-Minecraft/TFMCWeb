/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import UploadForm from "./UploadForm";

vi.mock("../../../lib/skins/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/skins/api")>()),
  getCatalog: vi.fn(() => new Promise(() => undefined)),
  createSubmission: vi.fn(),
  checkSubmissionConflict: vi.fn(),
}));
// WebGL previews are not under test here.
vi.mock("./ModelPreview", () => ({
  default: () => <div data-testid="preview" />,
}));
vi.mock("./ArmorPreview", () => ({
  default: () => <div data-testid="armor-preview" />,
}));

afterEach(cleanup);

function renderForm(skinKinds: string[] | null) {
  return render(<UploadForm sessionToken="t" skinKinds={skinKinds} onSubmitted={() => undefined} />);
}

describe("UploadForm item-first flow", () => {
  it("asks what is being skinned before anything else", () => {
    renderForm(["handheld"]);
    expect(screen.getByRole("heading", { name: /What are you skinning/ })).toBeTruthy();
    expect(screen.queryByText("Details")).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
  });

  it("offers a wand's flat style and shows 3D locked to Ascended", () => {
    renderForm(["handheld"]);
    fireEvent.click(screen.getByRole("radio", { name: /Wands/ }));
    const styles = screen.getByRole("radiogroup", { name: "Skin style" });
    const flat = within(styles).getByRole("radio", { name: /Flat/ });
    const threeD = within(styles).getByRole("radio", { name: /3D model/ });
    expect(flat.getAttribute("aria-checked")).toBe("true");
    expect((threeD as HTMLButtonElement).disabled).toBe(true);
    expect(threeD.textContent).toContain("Ascended");
    expect(screen.getByLabelText("Texture")).toBeTruthy();
    expect(screen.getByLabelText("Texture animation (.mcmeta)")).toBeTruthy();
  });

  it("asks for a texture and five models for a 3D crossbow", () => {
    renderForm(null);
    fireEvent.change(screen.getByPlaceholderText(/Search/), {
      target: { value: "cross" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Crossbows/ }));
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Skin style" })).getByRole("radio", { name: /3D model/ }),
    );
    for (const label of ["Texture", "Standby model", "Pull 0 model", "Pull 1 model", "Pull 2 model", "Charged model"]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.queryByLabelText("Standby model animation (.mcmeta)")).toBeNull();
    expect(screen.getByText(/All files together: 0 bytes of 60 KB/)).toBeTruthy();
  });

  it("locks items a rank cannot skin at all", () => {
    renderForm(["armor_set"]);
    const tile = screen.getByRole("radio", {
      name: /Battle standards/,
    }) as HTMLButtonElement;
    expect(tile.disabled).toBe(true);
    expect(tile.textContent).toContain("Ascended");
  });

  it("makes a single armour set one fixed set with no layer animation", () => {
    renderForm(["armor_set"]);
    fireEvent.click(screen.getByRole("radio", { name: /Leather/ }));
    expect(screen.getByText("Leather armour", { selector: "h3" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Set types" })).toBeNull();
    expect(screen.getByLabelText("Chestplate icon animation (.mcmeta)")).toBeTruthy();
    expect(screen.queryByLabelText("Layer 1 animation (.mcmeta)")).toBeNull();
  });

  it("lets a metal line pick each weight", () => {
    renderForm(["armor_set"]);
    fireEvent.click(screen.getByRole("radio", { name: /^Steel/ }));
    const types = screen.getByRole("group", { name: "Set types" });
    fireEvent.click(within(types).getByRole("button", { name: /Light Steel/ }));
    fireEvent.click(within(types).getByRole("button", { name: /Heavy Steel/ }));
    expect(screen.getAllByText(/^(Light|Heavy) Steel$/, { selector: "span" }).length).toBe(2);
  });
});
