import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getMaterialBySlug, materialCatalog, serverCraftedMaterials } from "../data";
import MaterialsPage from "./page";
import MaterialDetailPage from "./[slug]/page";

describe("material acquisition", () => {
  it("does not claim gathered materials have no recipes", () => {
    const html = renderToStaticMarkup(MaterialsPage());
    expect(html).not.toContain("Drop / gather only");
    expect(html).not.toContain("These materials have no crafting recipe");
  });

  it.each(["Niter", "Arcane Crystal"])("does not register %s as crafted", (name) => {
    expect(serverCraftedMaterials.some((m) => m.name === name)).toBe(false);
  });

  it.each(["tin", "ignitium"])("separates %s gathering from unpacking", async (slug) => {
    const html = renderToStaticMarkup(await MaterialDetailPage({ params: Promise.resolve({ slug }) }));
    expect(html).toContain("Unpacking a block");
    expect(html).toContain("already own");
    expect(html).not.toContain("Chance");
    expect(getMaterialBySlug(slug)?.recipe).toBeUndefined();
    const unpacking = getMaterialBySlug(slug)!.unpackingRecipes;
    expect(unpacking).toHaveLength(1);
    expect(unpacking[0].ingredients).toMatchObject([{ qty: 1 }]);
    expect(unpacking[0].output.qty).toBe(4);
    expect(unpacking[0].station).toBe("Ingot Station");
    expect(unpacking[0].time).toBe(5);
  });

  it.each(["niter", "arcane-crystal"])("documents actual %s acquisition", async (slug) => {
    const html = renderToStaticMarkup(await MaterialDetailPage({ params: Promise.resolve({ slug }) }));
    expect(html).toContain("Lucky Miner I");
    expect(html).not.toContain("0.05%");
    expect(html).toContain("Rare Ore Mine");
    expect(html).not.toContain("50%");
    expect(html).not.toContain("No crafting recipe. This material comes from loot");
  });

  it("lists no acquisition sources for Tin", () => {
    expect(getMaterialBySlug("tin")!.acquisition).toBeUndefined();
  });

  it.each([
    "bloodmagic-essence",
    "necromancy-essence",
    "smokeless-powder",
    "fossil",
    "basic-magical-handle",
    "iron-magical-core",
  ])("has no page for %s, which players can't get as a material", (slug) => {
    expect(getMaterialBySlug(slug)).toBeUndefined();
  });

  it("gives every material something to say about where it comes from", () => {
    // Act materials whose sources change from act to act carry no source list for now.
    const noSourceYet = new Set(["Tin", "Abyssalite Fragment", "Mythril Fragment", "Mythrilite"]);
    for (const material of materialCatalog.values()) {
      if (noSourceYet.has(material.name)) continue;
      expect((material.acquisition?.length ?? 0) + material.recipes.length, material.name).toBeGreaterThan(0);
    }
  });

  it("no longer offers the Pouch of Rare Materials as a source", async () => {
    const html = renderToStaticMarkup(await MaterialDetailPage({ params: Promise.resolve({ slug: "ignitium" }) }));
    expect(html).not.toContain("Pouch of Rare Materials");
    expect(html).not.toContain("not yet been verified");
  });

  it("groups every material on the index page", () => {
    const html = renderToStaticMarkup(MaterialsPage());
    for (const material of materialCatalog.values()) {
      expect(html, material.name).toContain(`href="/wiki/materials/${material.slug}"`);
    }
  });

  it("lists Ignitium sources without any drop chances", () => {
    const sources = getMaterialBySlug("ignitium")!.acquisition!;
    expect(sources.some((s) => s.method.includes("Lucky Miner I"))).toBe(true);
    expect(sources.some((s) => s.method.includes("Tree Gatherer IV"))).toBe(true);
    expect(sources.every((s) => !("chance" in s) && !/%|chance/i.test(s.detail))).toBe(true);
  });
});
