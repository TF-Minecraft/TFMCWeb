/**
 * Builds what vehicle skin uploads need from the live server's files:
 *
 *   shared/skins/vehicle_skins.json            vehicles, and the size of each texture
 *   public/skins/vehicles/<id>.json            preview model (same format as the wiki's)
 *   public/skins/vehicles/<id>/<index>.png     the original textures, the templates players paint
 *
 * A vehicle skin swaps every texture of the vehicle's default ModelEngine model and keeps the
 * shape (ArmourShop VehicleSkinWriter), so each upload must match its texture's exact size, in
 * the model's texture order. Run this again whenever a vehicle model changes on Main.
 *
 * Read the inputs from copies of Main's folders, never write to the server:
 *   VEHICLE_BLUEPRINTS=<copy of plugins/ModelEngine/blueprints>
 *   VF_VEHICLES=<copy of plugins/VehicleFramework/vehicles>
 *   node scripts/build-vehicle-skin-templates.mjs
 */

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "./convert-vehicle-bbmodels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..");
const OUT_JSON = join(FRONTEND, "..", "shared", "skins", "vehicle_skins.json");
const OUT_PUBLIC = join(FRONTEND, "public", "skins", "vehicles");

/**
 * Reads the parts of a VehicleFramework vehicle file this needs: each vehicle's name and the
 * ModelEngine model of its default skin (`model:` names the default skin id under `skins:`).
 * The files use plain block YAML with nested keys indented one level per section.
 */
export function readVehicleFile(text) {
  const vehicles = [];
  let current = null;
  let childIndent = -1;
  let skinsIndent = -1;
  let skin = null;
  let skinIndent = -1;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const match = /^\s*([A-Za-z0-9_]+):\s*(.*)$/.exec(raw);
    if (!match) continue;
    const [, key, rest] = match;
    const value = rest.replace(/^["']|["']$/g, "").trim();
    if (indent === 0) {
      current = { id: key, name: key, defaultSkin: null, skins: {} };
      vehicles.push(current);
      childIndent = -1;
      skinsIndent = -1;
      skin = null;
      continue;
    }
    if (!current) continue;
    if (childIndent < 0) childIndent = indent;
    if (skinsIndent >= 0 && indent > skinsIndent) {
      // Inside skins: each skin is one level deeper, its keys one more.
      if (!skin || indent <= skinIndent) {
        skin = { id: key, model: null };
        skinIndent = indent;
        current.skins[key] = skin;
      } else if (key === "model") {
        skin.model = value;
      }
      continue;
    }
    skinsIndent = -1;
    skin = null;
    // Only the vehicle's own keys: weapons and states have their own name/model fields.
    if (indent !== childIndent) continue;
    if (key === "skins" && !value) skinsIndent = indent;
    else if (key === "name" && value) current.name = value;
    else if (key === "model" && value) current.defaultSkin = value;
  }
  return vehicles.map((v) => ({
    id: v.id,
    label: v.name.replace(/§./g, "").trim() || v.id,
    model: v.defaultSkin ? (v.skins[v.defaultSkin]?.model ?? null) : null,
  }));
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** PNG width and height from the IHDR chunk. */
export function pngSize(buf) {
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") throw new Error("not a PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function main() {
  const blueprints = process.env.VEHICLE_BLUEPRINTS;
  const vehiclesDir = process.env.VF_VEHICLES;
  if (!blueprints || !vehiclesDir) throw new Error("Set VEHICLE_BLUEPRINTS and VF_VEHICLES (copies of Main's folders)");

  const byModel = new Map();
  for (const path of walk(blueprints)) {
    if (path.toLowerCase().endsWith(".bbmodel")) {
      const id = path.slice(path.replace(/\\/g, "/").lastIndexOf("/") + 1, -".bbmodel".length).toLowerCase();
      if (!byModel.has(id)) byModel.set(id, path);
    }
  }

  const vehicles = [];
  for (const file of readdirSync(vehiclesDir)
    .filter((f) => /\.ya?ml$/i.test(f))
    .sort()) {
    for (const vehicle of readVehicleFile(readFileSync(join(vehiclesDir, file), "utf8"))) {
      const path = vehicle.model ? byModel.get(vehicle.model.toLowerCase()) : null;
      if (!path) {
        console.warn(`${vehicle.id}: no blueprint for model ${vehicle.model}, skipped`);
        continue;
      }
      const bb = JSON.parse(readFileSync(path, "utf8"));
      const textures = [];
      mkdirSync(join(OUT_PUBLIC, vehicle.id), { recursive: true });
      bb.textures.forEach((tex, index) => {
        const base64 = String(tex.source || "").split(",")[1];
        if (!base64) throw new Error(`${vehicle.id}: texture ${index} is not embedded`);
        const buf = Buffer.from(base64, "base64");
        writeFileSync(join(OUT_PUBLIC, vehicle.id, `${index}.png`), buf);
        textures.push({
          key: String(tex.id ?? index),
          ...pngSize(buf),
          sha256: createHash("sha256").update(buf).digest("hex"),
        });
      });
      // The wiki converter flattens the rig into one static model; its textures go to a temp folder.
      const scratch = mkdtempSync(join(tmpdir(), "vskin-"));
      try {
        const relPath = relative(blueprints, path)
          .replace(/\\/g, "/")
          .replace(/\.bbmodel$/i, "");
        convert(vehicle.id, relPath, null, {
          blueprintsDir: blueprints,
          modelsDir: OUT_PUBLIC,
          texturesDir: scratch,
          texturePrefix: "vehicles",
        });
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
      vehicles.push({ id: vehicle.id, label: vehicle.label, textures });
      console.log(`${vehicle.id.padEnd(18)} ${textures.map((t) => `${t.width}x${t.height}`).join(" ")}`);
    }
  }
  vehicles.sort((a, b) => a.label.localeCompare(b.label));
  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        comment:
          "Generated by frontend/scripts/build-vehicle-skin-templates.mjs from Main's vehicle models. One upload per texture, exact size, in model order.",
        vehicles,
      },
      null,
      2,
    ) + "\n",
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
