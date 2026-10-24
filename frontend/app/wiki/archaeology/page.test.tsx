import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ArchaeologyPage from "./page";

describe("Archaeology gameplay guide", () => {
  const html = renderToStaticMarkup(<ArchaeologyPage />);

  it("covers every phase from finding a ruin to closing the site", () => {
    for (const heading of [
      "1. Find a ruin",
      "2. Confirm it",
      "3. Plant the camp",
      "4. Dig: hear, then release",
      "5. Brush the find out",
      "6. Clean, sketch, register",
      "7. Classify the find",
      "8. Museum",
      "9. When the site is finished",
    ]) {
      expect(html, heading).toContain(heading);
    }
  });

  it("documents the player actions and distinctions that control the workflow", () => {
    for (const phrase of [
      "neighboring chunk rather than the ruin itself",
      "hold left-click with an excavation tool",
      "Release on the ready chime",
      "air on at least one face",
      "aiming at a dripping cube",
      "Click the paper onto the pencil",
      "Put the signed drawing in the top slot",
      "sneak and right-click the displayed find",
      "right-click it later to reopen the excavation dossier",
    ]) {
      expect(html, phrase).toContain(phrase);
    }
  });

  it("does not retain unsupported numeric rules from the previous dossier", () => {
    for (const staleClaim of [
      "256 blocks",
      "four distinct samples",
      "18 places",
      "8 successful cuts",
      "Brush min(shape size, 6)",
      "a case that accepts plaques",
    ]) {
      expect(html).not.toContain(staleClaim);
    }
  });
});
