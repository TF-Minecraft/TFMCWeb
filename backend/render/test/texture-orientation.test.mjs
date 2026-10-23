import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

let browser;
let page;

before(async () => {
  browser = await chromium.launch({ headless: true, args: ["--disable-gpu-sandbox"] });
  page = await browser.newPage();
  await page.setContent('<!DOCTYPE html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ path: fileURLToPath(new URL("../dist/browser.js", import.meta.url)) });
});

after(async () => {
  await browser?.close();
});

async function renderPixels(kind, views = ["model"]) {
  return page.evaluate(async ({ kind, views }) => {
    // A sparse atlas: the model uses the opaque top quarter. Flipping it
    // vertically samples transparency instead and makes whole faces disappear.
    const atlas = document.createElement("canvas");
    atlas.width = 32;
    atlas.height = 32;
    const ctx = atlas.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 32, 8);
    const texture = atlas.toDataURL("image/png");
    const faces = Object.fromEntries(
      ["north", "east", "south", "west", "up", "down"].map((face) => [
        face, { uv: [0, 0, 16, 4], texture: "#0" },
      ])
    );
    const model = JSON.stringify({
      textures: { "0": "item/test" },
      elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces }],
    });
    const pngs = await window.renderPreviewJob({
      kind, views, assets: { texture, model, carry: model, aim: model, reload: model },
    });
    const counts = {};
    for (const [view, src] of Object.entries(pngs)) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, img.width, img.height);
      let red = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200 && data[i + 1] < 20 && data[i + 2] < 20) red++;
      }
      counts[view] = red;
    }
    return counts;
  }, { kind, views });
}

for (const kind of ["item_3d", "shield", "helmet_3d", "mask", "gun"]) {
  test(`${kind} model samples the opaque part of the Java atlas`, async () => {
    const counts = await renderPixels(kind);
    assert.ok(counts.model > 1000, `Expected opaque model faces, got ${counts.model} red pixels`);
  });
}

test("held gun views keep the Java atlas orientation", async () => {
  const counts = await renderPixels("gun", ["carry", "aim", "reload"]);
  for (const view of ["carry", "aim", "reload"]) {
    assert.ok(counts[view] > 100, `${view}: expected an opaque held model, got ${counts[view]} red pixels`);
  }
});

for (const kind of ["handheld", "large_handheld", "bow", "large_bow", "crossbow", "book"]) {
  test(`${kind} extrusion keeps its own top-down texture orientation`, async () => {
    const counts = await renderPixels(kind);
    assert.ok(counts.model > 100, `Expected the red sprite to remain visible, got ${counts.model} red pixels`);
  });
}
