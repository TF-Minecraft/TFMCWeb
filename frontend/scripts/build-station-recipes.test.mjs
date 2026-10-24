import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  build,
  cookingOrigin,
  isHiddenOutput,
  NO_ITEM_NOTE,
  parseRef,
  parseStationRecipes,
  perkLabel,
} from "./build-station-recipes.mjs";

describe("station recipe parsing", () => {
  it("reads recipes indented 4/6/8 and 4/8/12 in the same file", () => {
    const { recipes, unparsed } = parseStationRecipes(`
recipes:
    narrow:
      output:
        type: PETS
        id: PET_BALL
        amount: 1
      conditions:
      - permission{list="legacy";display="Requires Legacy"}
      ingredients:
      - 'vanilla{type=BONE,amount=16}'
    wide:
        output: 'itemsadder{id="tfmc:pet_house",amount=1}'
        crafting-time: 5
        ingredients:
        - 'vanilla{type=OAK_PLANKS,amount=8}'
        options:
            hide-when-locked: true
`);
    expect(unparsed).toEqual([]);
    expect(recipes.map((recipe) => recipe.key)).toEqual(["narrow", "wide"]);
    expect(recipes[0].fields.output).toEqual({ type: "PETS", id: "PET_BALL", amount: "1" });
    expect(recipes[0].fields.ingredients).toEqual(["vanilla{type=BONE,amount=16}"]);
    expect(recipes[1].fields.options).toEqual({ "hide-when-locked": "true" });
  });

  it("still reports lines it cannot place", () => {
    const { unparsed } = parseStationRecipes(`
recipes:
    broken:
        output:
          stray: 1
            deeper: 2
`);
    expect(unparsed.map((line) => line.text.trim())).toEqual(["deeper: 2"]);
  });

  it("reads the vanilla origin of a Cooking food", () => {
    const ref = parseRef(
      'cooking{item="seafood(type=seafood_whole;origin=Tropical Fish)",amount=64,display="Tropical Fish"}',
    );
    expect(cookingOrigin(ref)).toBe("Tropical_Fish");
  });
});

describe("station recipe build", () => {
  let dir;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("shows a Cooking food under its own name with its vanilla identity", () => {
    dir = mkdtempSync(path.join(tmpdir(), "stations-"));
    writeFileSync(
      path.join(dir, "animal-station.yml"),
      `
recipes:
    meat-treat:
        output:
            type: PETS
            id: MEAT_TREAT
            amount: 1
        ingredients:
        - 'cooking{item="meat(type=meat_red_meat;origin=Beef)",amount=2,display="Beef Steak"}'
        - 'vanilla{type=BEEF,amount=1}'
`,
    );
    const { recipes } = build({ sourceDir: dir, textureIndex: { byName: new Map() } });
    const [steak, beef] = recipes[0].ingredients;
    expect(steak).toMatchObject({ name: "Beef Steak", qty: 2, sourceId: "vanilla:beef" });
    // The Cooking display name must not rename plain vanilla beef.
    expect(beef).toMatchObject({ name: "Beef", sourceId: "vanilla:beef" });
  });

  it("leaves hidden outputs off the wiki", () => {
    dir = mkdtempSync(path.join(tmpdir(), "stations-"));
    writeFileSync(
      path.join(dir, "tool-station.yml"),
      `
recipes:
    yellow-chip-spruce:
        output: "itemsadder{id=yellow_chip}"
        ingredients:
        - 'vanilla{type=SPRUCE_BUTTON,amount=1}'
    stick:
        output: 'vanilla{type=STICK,amount=4}'
        ingredients:
        - 'vanilla{type=OAK_PLANKS,amount=2}'
`,
    );
    const { recipes } = build({ sourceDir: dir, textureIndex: { byName: new Map() } });
    expect(recipes.map((recipe) => recipe.output.name)).toEqual(["Stick"]);
    expect(isHiddenOutput('itemsadder{id="tfmc_games:yellow_chip"}')).toBe(true);
  });

  it("notes recipes that grant their effect instead of the item", () => {
    dir = mkdtempSync(path.join(tmpdir(), "stations-"));
    writeFileSync(
      path.join(dir, "tool-station.yml"),
      `
recipes:
    skill-reallocation-point:
        output:
            type: BOOKS
            id: SKILL_REALLOCATION_BOOK
            amount: 1
        options:
            output-item: false
        ingredients:
        - 'vanilla{type=PAPER,amount=1}'
        triggers:
        - command{format="mmocore admin skill-realloc-points give %player% 1",sender=CONSOLE}
    iron-hook:
        output:
            type: FISHING
            id: IRON_HOOK
        options:
            output-item: false
        ingredients:
        - 'vanilla{type=IRON_INGOT,amount=1}'
        triggers:
        - command{format="customfishing items give %player% iron_hook 1 --to-inventory",sender=CONSOLE}
    stick:
        output: 'vanilla{type=STICK,amount=4}'
        ingredients:
        - 'vanilla{type=OAK_PLANKS,amount=2}'
`,
    );
    const { recipes } = build({ sourceDir: dir, textureIndex: { byName: new Map() } });
    expect(recipes[0].note).toBe(NO_ITEM_NOTE);
    // The hook is still handed over, by another plugin's give command.
    expect(recipes[1].note).toBeUndefined();
    expect(recipes[2].note).toBeUndefined();
  });

  it("names the item a recipe really takes when its label names a different item", () => {
    dir = mkdtempSync(path.join(tmpdir(), "stations-"));
    writeFileSync(
      path.join(dir, "medicine-station.yml"),
      `
recipes:
    claw:
        output:
            type: MATERIALS
            id: CLAW
            amount: 1
        ingredients:
        - mmoitem{type=MATERIALS,id=REFINED_ELDERWOOD,amount=4,display="Refined Maplewood"}
        - mmoitem{type=MATERIALS,id=REFINED_MAPLEWOOD,amount=4,display="Refined Maplewood"}
`,
    );
    const items = new Map([
      ["REFINED_ELDERWOOD", { name: "Refined Elderwood" }],
      ["REFINED_MAPLEWOOD", { name: "Refined Maplewood" }],
    ]);
    const { recipes } = build({ sourceDir: dir, textureIndex: { byName: new Map() }, items });
    expect(recipes[0].ingredients.map((slot) => slot.name)).toEqual(["Refined Elderwood", "Refined Maplewood"]);
  });

  it("shows the perk tier a recipe really checks and fixes misspelt perk labels", () => {
    expect(perkLabel("Requires §6Transmutation II", "professions.transmutation_1")).toBe("Transmutation I");
    expect(perkLabel("Requires §6Transmutation II", "professions.transmutation_2")).toBe("Transmutation II");
    expect(perkLabel("Requires §6Tree Crafer", "professions.tree_crafter")).toBe("Tree Crafter");
    expect(perkLabel("Requires §6Gilded", "gilded")).toBe("Gilded");
  });
});
