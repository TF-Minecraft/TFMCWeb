// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Matrix4, Euler, Vector3 } from "three";
import {
  buildModelBuffers,
  faceUvs,
  referencedTextureKeys,
  resolveTextureUrls,
  type WikiBlockModel,
} from "../../components/wiki/modelGeometry";
import { vehicles, vehicleRecipes, getSeatCounts, getVehicleBySlug } from "../data/vehicles";
import VehicleDetail, { generateStaticParams } from "./[slug]/page";
import VehiclesPage from "./page";

describe("vehicle catalogue and actual assets", () => {
  it("covers every base blueprint and lists only skins with a model", () => {
    expect(vehicles).toHaveLength(25);
    expect(new Set(vehicles.map((v) => v.slug)).size).toBe(25);
    const skins = vehicles.flatMap((v) => v.skins);
    expect(skins.filter((s) => s.modelUrl)).toHaveLength(41);
    expect(skins.filter((s) => !s.modelUrl)).toHaveLength(0);
    for (const vehicle of vehicles) {
      expect(vehicle.seats, vehicle.slug).toMatch(/^\d+\/\d+\/\d+$/);
      expect(getVehicleBySlug(vehicle.slug)).toBe(vehicle);
      expect(vehicle.skins[0].modelUrl).toBeTruthy();
      expect(vehicleRecipes.find((r) => r.output.name === vehicle.name)?.ingredients.length).toBeGreaterThan(0);
    }
    expect(getVehicleBySlug("unknown")).toBeUndefined();
    expect(vehicleRecipes.find((r) => r.output.name === "Wooden Cart")?.time).toBe(5 * 60);
    expect(vehicleRecipes.find((r) => r.output.name === "Simple Locomotive")?.time).toBe(4 * 3600);
    expect(vehicleRecipes.find((r) => r.output.name === "Behemoth")?.time).toBe(3 * 86400);
  });

  it("loads every texture key, including Wooden Cart's 1–5 map, and builds finite geometry", () => {
    for (const skin of vehicles.flatMap((v) => v.skins)) {
      if (!skin.modelUrl) continue;
      const model: WikiBlockModel = JSON.parse(readFileSync(join(process.cwd(), "public", skin.modelUrl), "utf8"));
      const keys = referencedTextureKeys(model);
      const urls = resolveTextureUrls(keys, skin.textures);
      keys.forEach((key, index) => {
        expect(skin.textures?.[key], `${skin.id} #${key}`).toBeTruthy();
        expect(urls[index]).toBe(skin.textures?.[key]);
        expect(existsSync(join(process.cwd(), "public", urls[index]!)), `${skin.id} ${urls[index]}`).toBe(true);
      });
      const buffers = buildModelBuffers(model, keys.length, (key) => keys.indexOf(key?.replace(/^#/, "") ?? ""));
      expect(buffers.reduce((n, b) => n + b.index.length, 0)).toBeGreaterThan(0);
      for (const b of buffers) {
        expect([...b.position, ...b.normal, ...b.uv].every(Number.isFinite)).toBe(true);
        expect(b.index.every((i) => i >= 0 && i < b.position.length / 3)).toBe(true);
      }
    }
  });

  it("keeps source-normalized airframe and turret UVs across all nine biplane models", () => {
    const biplane = getVehicleBySlug("biplane");
    const renderedSkins = biplane?.skins.filter((skin) => skin.modelUrl) ?? [];
    expect(renderedSkins).toHaveLength(9);

    for (const skin of renderedSkins) {
      expect(skin.modelUrl).toBe("/wiki/models/vehicles/biplane.json");
      expect(skin.textures).toEqual({
        "0": `/wiki/textures/vehicles/${skin.id}/0.png`,
        "1": "/wiki/textures/vehicles/biplane/1.png",
      });

      const model: WikiBlockModel = JSON.parse(readFileSync(join(process.cwd(), "public", skin.modelUrl!), "utf8"));
      const airframeFace = model.elements.find((element) => element.from.join(",") === "-4,32,-24")?.faces.north;
      const turretFace = model.elements.find((element) => element.from.join(",") === "65,31,48")?.faces.north;

      expect(airframeFace, `${skin.id} airframe face`).toBeDefined();
      expect(turretFace, `${skin.id} turret face`).toBeDefined();
      // Blockbench source: airframe [8,2,16,4] on 128x128; turret
      // [2,2,12,4] on 32x32. Both must sample the same normalized regions.
      expect(faceUvs(airframeFace!)).toEqual([
        [8 / 128, 1 - 2 / 128],
        [16 / 128, 1 - 2 / 128],
        [8 / 128, 1 - 4 / 128],
        [16 / 128, 1 - 4 / 128],
      ]);
      expect(faceUvs(turretFace!)).toEqual([
        [2 / 32, 1 - 2 / 32],
        [12 / 32, 1 - 2 / 32],
        [2 / 32, 1 - 4 / 32],
        [12 / 32, 1 - 4 / 32],
      ]);
    }
  });
});

describe("vehicle page rendering", () => {
  it("publishes every vehicle detail with one model renderer and every previewable skin option", async () => {
    expect(generateStaticParams()).toEqual(vehicles.map(({ slug }) => ({ slug })));

    for (const vehicle of vehicles) {
      const html = renderToStaticMarkup(await VehicleDetail({ params: Promise.resolve({ slug: vehicle.slug }) }));
      expect(html.match(/Loading /g) ?? [], vehicle.slug).toHaveLength(1);
      // Skins with no model are not offered, unless the vehicle has no previewable skin at all.
      const previewable = vehicle.skins.filter((skin) => skin.modelUrl);
      for (const skin of previewable.length ? previewable : vehicle.skins) {
        expect(html, `${vehicle.slug} omits previewable skin ${skin.name}`).toContain(skin.name);
      }
      expect(html, vehicle.slug).not.toContain("preview unavailable)");
    }
  });

  it("renders one selected model and all vehicle selectors on the index", () => {
    const html = renderToStaticMarkup(VehiclesPage());

    expect(html.match(/Loading /g) ?? []).toHaveLength(1);
    expect(html.match(/aria-pressed=/g) ?? []).toHaveLength(vehicles.length);
    expect(html).toContain(`href="/wiki/vehicles/${vehicles[0].slug}"`);
    for (const vehicle of vehicles) {
      expect(html).toContain(`>${vehicle.name}</button>`);
    }
    for (const skin of vehicles[0].skins) expect(html).toContain(skin.name);
    expect(html).toContain('id="routes"');
    expect(html).toContain('id="cargo-docks"');
  });

  it("words seat, captain and mechanic instructions from each vehicle's seats", async () => {
    expect(getSeatCounts({ seats: "1/2/13" })).toEqual({ captain: 1, mechanic: 2, passenger: 13, total: 16 });
    expect(getSeatCounts({ seats: "0/0/0" }).total).toBe(0);
    const detail = async (slug: string) =>
      renderToStaticMarkup(await VehicleDetail({ params: Promise.resolve({ slug }) })).replace(/<!-- -->/g, "");

    const flatCar = await detail("flat-car");
    expect(flatCar).toContain("riders stand on its deck");
    expect(flatCar).toContain('href="/wiki/vehicles#cargo-docks"');
    expect(flatCar).toContain("While whitelisting is on, whitelisted players and allowed groups can open it too");
    expect(flatCar).toContain('href="/wiki/vehicles#routes"');
    expect(flatCar).not.toContain("passenger access and tickets");
    expect(flatCar).not.toContain("select a seat");
    expect(flatCar).not.toContain("mechanic seat");
    expect(flatCar).not.toContain("Only the captain steers");

    const coalCar = await detail("coal-car");
    expect(coalCar).toContain("then right-click to select a seat");
    expect(coalCar).not.toContain("Only the captain steers");
    expect(coalCar).not.toContain("mechanic seat");

    expect(await detail("simple-locomotive")).toContain('href="/wiki/vehicles#routes"');

    const ironclad = await detail("ironclad");
    expect(ironclad).toContain("Only the captain steers");
    expect(ironclad).toContain("or from a mechanic seat");
    expect(ironclad).toContain("passenger access and tickets");
    expect(ironclad).not.toContain('href="/wiki/vehicles#routes"');

    // Civilian vehicles: no rank, no upkeep, no weapons; the Karve sails and the balloon burns Arcane Fuel.
    const karve = await detail("karve");
    expect(karve).toContain("Its sails use wind.");
    expect(karve).toContain("Shift reopens seat selection.");
    expect(karve).not.toContain('id="fuel"');
    const windrider = await detail("windrider");
    expect(windrider).toContain('id="fuel"');
    expect(windrider).toContain("Land before refuelling.");
    expect(windrider).not.toContain("reload bomb bays");
    expect(windrider).toContain("in flight, Shift alone descends");
    expect(windrider).toContain("Cargo Hold, 27 slots");
    for (const slug of ["scout", "windrider", "karve"]) {
      const vehicle = getVehicleBySlug(slug)!;
      expect(vehicle.requirement, slug).toBe("None");
      expect(vehicle.upkeep, slug).toBe(0);
      expect(vehicle.weapons, slug).toBe("N/A");
      expect(await detail(slug)).toMatch(/Daily upkeep<\/td><td[^>]*>None</);
    }

    // No balance numbers (component health, speed, burn rate, runtime) on any vehicle page.
    for (const vehicle of vehicles) {
      const html = await detail(vehicle.slug);
      for (const banned of ["Components and HP", "Speed", "Burn / second", "Full-tank runtime"]) {
        expect(html, `${vehicle.slug} ${banned}`).not.toContain(banned);
      }
    }

    // Seatless wording assumes a coupled train car with a hold opened from its menu.
    for (const vehicle of vehicles.filter((v) => getSeatCounts(v).total === 0)) {
      expect(vehicle.category, vehicle.slug).toBe("train");
      expect(vehicle.cargo, vehicle.slug).not.toBe("N/A");
    }
  });
});

describe("vehicle model rotations", () => {
  it("matches Three.js XYZ rotation around the model pivot for compound angles", () => {
    const angles: [number, number, number] = [22.5, -45, 30];
    const model: WikiBlockModel = {
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          rotation: { origin: [8, 8, 8], euler: angles },
          faces: { east: { uv: [0, 0, 16, 16], texture: "#1" } },
        },
      ],
    };
    const [buffer] = buildModelBuffers(model, 1, () => 0);
    const matrix = new Matrix4().makeRotationFromEuler(
      new Euler(...(angles.map((a) => (a * Math.PI) / 180) as [number, number, number]), "XYZ"),
    );
    const expected = new Vector3(0.5, 0.5, 0.5).applyMatrix4(matrix).addScalar(0.5);
    expected.toArray().forEach((value, i) => expect(buffer.position[i]).toBeCloseTo(value));
    const normal = new Vector3(1, 0, 0).transformDirection(matrix);
    normal.toArray().forEach((value, i) => expect(buffer.normal[i]).toBeCloseTo(value));
  });

  it("applies nested parent-bone rotations from nearest parent outwards", () => {
    const model: WikiBlockModel = {
      elements: [
        {
          from: [16, 0, 0],
          to: [32, 16, 16],
          parentRotations: [
            { origin: [0, 0, 0], euler: [0, 0, 90] },
            { origin: [0, 0, 0], euler: [0, 90, 0] },
          ],
          faces: { east: { uv: [0, 0, 16, 16], texture: "#1" } },
        },
      ],
    };
    const [buffer] = buildModelBuffers(model, 1, () => 0);
    const expected = new Vector3(2, 1, 1)
      .applyEuler(new Euler(0, 0, Math.PI / 2, "XYZ"))
      .applyEuler(new Euler(0, Math.PI / 2, 0, "XYZ"));
    expected.toArray().forEach((value, i) => expect(buffer.position[i]).toBeCloseTo(value));
  });

  it("preserves the real biplane eight-segment turret chain and its transformed bounds", () => {
    const biplane: WikiBlockModel = JSON.parse(
      readFileSync(join(process.cwd(), "public/wiki/models/vehicles/biplane.json"), "utf8"),
    );
    const tip = biplane.elements.find(
      (element) => element.from.join(",") === "65,31,48" && element.to.join(",") === "75,33,50",
    );

    expect(tip, "source guncircle8 cube must survive conversion").toBeDefined();
    expect(tip?.parentRotations).toEqual(
      [65, 55, 45, 35, 25, 15, 5].map((x) => ({
        origin: [x, 32, 49],
        euler: [0, 45, 0],
        order: "ZYX",
      })),
    );

    const buffers = buildModelBuffers({ elements: [tip!] }, 2, (key) => (key?.replace(/^#/, "") === "1" ? 1 : 0));
    const positions = buffers.flatMap((buffer) => buffer.position);
    const points = Array.from(
      { length: positions.length / 3 },
      (_, index) => new Vector3(...positions.slice(index * 3, index * 3 + 3)),
    );
    const minimum = points.reduce((bounds, point) => bounds.min(point), new Vector3(Infinity, Infinity, Infinity));
    const maximum = points.reduce((bounds, point) => bounds.max(point), new Vector3(-Infinity, -Infinity, -Infinity));

    [-0.7986359121, 1.9375, 2.5763640879].forEach((value, index) =>
      expect(minimum.getComponent(index)).toBeCloseTo(value),
    );
    [-0.2683058262, 2.0625, 3.1066941738].forEach((value, index) =>
      expect(maximum.getComponent(index)).toBeCloseTo(value),
    );
  });

  it("rotates texture sampling clockwise without changing normalized bounds", () => {
    expect(faceUvs({ uv: [0, 0, 16, 16], rotation: 90 })).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
  });
});
